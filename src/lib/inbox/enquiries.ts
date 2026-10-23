import 'server-only';
import { sanityWriteClient } from '@/lib/sanity/writeClient';
import { CHRISTMAS_CUTOFF } from '@/lib/shop/madeToOrder';
import { lastMessage, type Thread } from './threads';

/**
 * The enquiry tracker: one private `enquiry.<thread key>` record per
 * conversation the agent has looked at, holding dates, status and topic only
 * (no names, addresses or message text: the dataset is public). The mailbox
 * stays the record of what was said; this is what lets the agent notice that
 * a customer has gone quiet, or that a date it was asked to wait for has come.
 */

export type EnquiryStatus = 'open' | 'awaitingCustomer' | 'ordered' | 'closed' | 'ignored';
export type EnquiryTopic =
  'madeToOrder' | 'bespoke' | 'sizing' | 'shipping' | 'orderIssue' | 'other';
export type FollowUpReason = 'noReply' | 'christmasCutoff' | 'customerAskedLater' | 'other';

export interface EnquiryDoc {
  _id: string;
  status?: EnquiryStatus;
  topic?: EnquiryTopic;
  firstAt?: string;
  lastCustomerAt?: string;
  lastReplyAt?: string;
  replyRef?: string;
  followUpOn?: string;
  followUpReason?: FollowUpReason;
  note?: string;
  followUps?: number;
  followUpDraftedAt?: string;
  festiveSent?: boolean;
  handled?: string[];
}

export const enquiryId = (key: string) => `enquiry.${key}`;
export const keyOf = (doc: EnquiryDoc) => doc._id.replace(/^enquiry\./, '');

const DAY = 86_400_000;
/** A gentle follow-up when the customer hasn't answered in this long. */
export const NO_REPLY_DAYS = 7;
/** Most follow-ups per stretch of silence. */
export const MAX_FOLLOW_UPS = 2;
/** The festive nudge goes out this many days before the cut-off. */
export const FESTIVE_LEAD_DAYS = 10;
/** Conversations quieter than this aren't followed up at all. */
const STALE_DAYS = 45;

export async function loadEnquiries(): Promise<EnquiryDoc[]> {
  return sanityWriteClient.fetch<EnquiryDoc[]>(
    `*[_type == "enquiry" && _id in path("enquiry.**")] | order(coalesce(lastCustomerAt, firstAt) desc)[0...500]`
  );
}

export const ukToday = (now = Date.now()) =>
  new Date(now).toLocaleDateString('sv-SE', { timeZone: 'Europe/London' });

const iso = (ms?: number) => (ms ? new Date(ms).toISOString() : undefined);

/**
 * Bring a record in line with its thread: who wrote last, when, and whether a
 * follow-up the agent drafted was sent, or deleted (taken as "don't chase").
 * Returns only the fields that changed.
 */
export function syncFields(
  doc: EnquiryDoc,
  t: Thread,
  now = Date.now()
): Partial<EnquiryDoc> & { unset?: string[] } {
  const out: Partial<EnquiryDoc> & { unset?: string[] } = {};
  const lastIn = t.inbound.at(-1);
  const lastOut = t.sent.at(-1);
  const lastCustomerAt = iso(lastIn?.date);
  const lastReplyAt = iso(lastOut?.date);

  if (lastCustomerAt && lastCustomerAt !== doc.lastCustomerAt) {
    out.lastCustomerAt = lastCustomerAt;
    // The customer wrote again: the next silence gets its own follow-ups.
    if (doc.lastCustomerAt) out.followUps = 0;
  }
  if (lastReplyAt && lastReplyAt !== doc.lastReplyAt) out.lastReplyAt = lastReplyAt;
  if (lastOut && lastOut.messageId !== doc.replyRef) out.replyRef = lastOut.messageId;

  const last = lastMessage(t);
  let status = doc.status;
  if (status !== 'ignored' && status !== 'ordered') {
    if (
      last?.box === 'inbox' &&
      (status !== 'closed' || (lastIn && iso(lastIn.date) !== doc.lastCustomerAt))
    ) {
      status = 'open';
    } else if (last?.box === 'sent' && status !== 'closed') {
      status = 'awaitingCustomer';
    }
  }

  // A follow-up the agent drafted: sent (a newer sent message), or deleted unsent.
  if (doc.followUpDraftedAt) {
    const at = Date.parse(doc.followUpDraftedAt);
    const sentSince = t.sent.some((s) => s.date >= at - 60_000);
    const draftWaiting = t.drafts.some((d) => d.date >= at - 60_000);
    if (sentSince) out.unset = [...(out.unset ?? []), 'followUpDraftedAt'];
    else if (!draftWaiting && now - at > 30 * 60_000) {
      out.unset = [...(out.unset ?? []), 'followUpDraftedAt'];
      if (status === 'awaitingCustomer') status = 'closed';
    }
  }

  if (
    status === 'awaitingCustomer' &&
    (doc.followUps ?? 0) >= MAX_FOLLOW_UPS &&
    lastOut &&
    now - lastOut.date > 14 * DAY
  ) {
    status = 'closed';
  }
  if (status !== doc.status) out.status = status;
  return out;
}

/** Why a follow-up is due now, or null. Only for conversations where the studio wrote last. */
export function followUpDue(doc: EnquiryDoc, t: Thread, now = Date.now()): FollowUpReason | null {
  if (doc.status !== 'awaitingCustomer') return null;
  if ((doc.followUps ?? 0) >= MAX_FOLLOW_UPS || doc.followUpDraftedAt) return null;
  const last = lastMessage(t);
  if (!last || last.box !== 'sent') return null;
  if (t.drafts.some((d) => d.date >= last.date - 60_000)) return null;
  const quiet = now - last.date;
  if (quiet > STALE_DAYS * DAY && !doc.followUpOn) return null;

  if (doc.followUpOn) {
    // A date the customer asked for wins, even over the festive nudge.
    return doc.followUpOn <= ukToday(now) ? (doc.followUpReason ?? 'customerAskedLater') : null;
  }
  const cutoff = CHRISTMAS_CUTOFF.getTime();
  const festive =
    now < cutoff &&
    now >= cutoff - FESTIVE_LEAD_DAYS * DAY &&
    !doc.festiveSent &&
    (doc.topic === 'madeToOrder' || doc.topic === 'bespoke') &&
    quiet >= 3 * DAY;
  if (festive) return 'christmasCutoff';
  if (quiet >= NO_REPLY_DAYS * DAY) return 'noReply';
  return null;
}

/** A note safe for the public dataset: no emails, phone numbers or long digit runs. */
export function cleanNote(note?: string): string | undefined {
  const clean = note
    ?.replace(/\S+@\S+/g, '')
    .replace(/\+?\d[\d\s().-]{5,}\d/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 80);
  return clean || undefined;
}

export async function patchEnquiry(
  key: string,
  t: Thread,
  set: Partial<EnquiryDoc>,
  opts: { unset?: string[]; inc?: Partial<Record<'followUps', number>>; handled?: string } = {}
): Promise<void> {
  const firstIn = t.inbound[0] ?? t.messages[0];
  const base = {
    _id: enquiryId(key),
    _type: 'enquiry',
    source: 'email',
    status: 'open',
    firstAt: iso(firstIn?.date) ?? new Date().toISOString(),
    followUps: 0,
    handled: [],
  };
  let patch = sanityWriteClient.patch(enquiryId(key)).set(set);
  if (opts.unset?.length) patch = patch.unset(opts.unset);
  if (opts.inc) patch = patch.inc(opts.inc);
  if (opts.handled) patch = patch.setIfMissing({ handled: [] }).append('handled', [opts.handled]);
  await sanityWriteClient
    .transaction()
    .createIfNotExists(base)
    .patch(patch)
    .commit({ visibility: 'async' });
}
