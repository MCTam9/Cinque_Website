import 'server-only';
import { CHRISTMAS_CUTOFF_LABEL, MADE_TO_ORDER_LEAD_TIME } from '@/lib/shop/madeToOrder';
import { Mailbox, type IndexedMessage } from './imap';
import { isContactForm } from './filters';
import { draftMime, newText, replySubject } from './text';
import {
  buildIndex,
  hashId,
  hasDraftAfter,
  isAnswered,
  lastMessage,
  ownAddress,
  type MailIndex,
  type Thread,
} from './threads';
import {
  cleanNote,
  followUpDue,
  keyOf,
  loadEnquiries,
  patchEnquiry,
  syncFields,
  type EnquiryDoc,
  type EnquiryTopic,
  type FollowUpReason,
} from './enquiries';
import { customerContext, orderedSince, type CustomerContext } from './customerContext';
import { issueTicket } from './auth';

/**
 * What the inbox agent's endpoints do. Every rule that keeps it safe lives
 * here rather than in its instructions: who a draft is addressed to, which
 * thread it joins, whose orders it can see, and that the only thing it can
 * ever write to the mailbox is a draft.
 */

export type ItemKind = 'new' | 'followUp' | 'track';

/** New customer emails are picked up for this long after they arrive. */
const NEW_WINDOW_DAYS = 3;
/** Conversations the studio answered directly, offered for tracking, this far back. */
const TRACK_WINDOW_DAYS = 30;
const MAX_ITEMS = { new: 15, followUp: 10, track: 10 };

const DAY = 86_400_000;
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

export function parseItemId(id: string): { kind: ItemKind; messageId: string } | null {
  const m = /^(new|followUp|track)\.([A-Za-z0-9_-]{4,400})$/.exec(id);
  if (!m) return null;
  const messageId = Buffer.from(m[2], 'base64url').toString('utf8');
  return /^<[^<>\s]+>$/.test(messageId) ? { kind: m[1] as ItemKind, messageId } : null;
}

// ── Queue ──

export interface QueueItem {
  id: string;
  kind: ItemKind;
  /** For follow-ups: why one is due. */
  reason?: FollowUpReason;
}

/** The latest customer message in `t` still waiting for a reply or a draft. */
function waitingInbound(
  t: Thread,
  doc: EnquiryDoc | undefined,
  now: number
): IndexedMessage | null {
  if (doc?.status === 'ignored') return null;
  const m = t.inbound.at(-1);
  if (!m || now - m.date > NEW_WINDOW_DAYS * DAY) return null;
  if (isAnswered(t, m) || hasDraftAfter(t, m.date)) return null;
  if (doc?.handled?.includes(hashId(m.messageId))) return null;
  return m;
}

export async function queue(now = Date.now()): Promise<QueueItem[]> {
  const docs = await loadEnquiries();
  const byKey = new Map(docs.map((d) => [keyOf(d), d]));

  return Mailbox.with(async (mb) => {
    const idx = await buildIndex(mb);
    const items: QueueItem[] = [];

    // Keep the tracker in step with the mailbox.
    for (const doc of docs) {
      const t = idx.byKey.get(keyOf(doc));
      if (!t) continue;
      const { unset, ...set } = syncFields(doc, t, now);
      if (Object.keys(set).length || unset?.length) {
        await patchEnquiry(keyOf(doc), t, set, { unset });
        Object.assign(doc, set);
        for (const f of unset ?? []) delete (doc as unknown as Record<string, unknown>)[f];
      }
    }

    for (const t of idx.threads) {
      const m = waitingInbound(t, byKey.get(t.key), now);
      if (m) items.push({ id: `new.${b64(m.messageId)}`, kind: 'new' });
    }

    for (const doc of docs) {
      const t = idx.byKey.get(keyOf(doc));
      if (!t) continue;
      const reason = followUpDue(doc, t, now);
      if (!reason) continue;
      const email = t.customer?.address;
      if (email && doc.firstAt && (await orderedSince(email, Date.parse(doc.firstAt)))) {
        await patchEnquiry(keyOf(doc), t, { status: 'ordered' });
        continue;
      }
      const last = lastMessage(t)!;
      items.push({ id: `followUp.${b64(last.messageId)}`, kind: 'followUp', reason });
    }

    // Conversations the studio answered itself, not yet tracked: the agent
    // classifies them so they can be followed up too.
    for (const t of idx.threads) {
      if (byKey.has(t.key) || t.inbound.length === 0 || !t.customer) continue;
      const last = lastMessage(t);
      if (!last || last.box !== 'sent' || now - last.date > TRACK_WINDOW_DAYS * DAY) continue;
      if (hasDraftAfter(t, last.date)) continue;
      items.push({ id: `track.${b64(last.messageId)}`, kind: 'track' });
    }

    const counts = { new: 0, followUp: 0, track: 0 };
    return items.filter((i) => ++counts[i.kind] <= MAX_ITEMS[i.kind]);
  });
}

// ── One item ──

interface Resolved {
  idx: MailIndex;
  thread: Thread;
  target: IndexedMessage;
  doc?: EnquiryDoc;
  reason?: FollowUpReason;
}

/** Find an item's thread and check it still needs what the kind says. */
async function resolve(
  mb: Mailbox,
  id: string,
  now = Date.now()
): Promise<Resolved | { error: string }> {
  const parsed = parseItemId(id);
  if (!parsed) return { error: 'Unknown item.' };
  const idx = await buildIndex(mb);
  const thread = idx.byMessageId.get(parsed.messageId);
  const target = thread?.messages.find((m) => m.messageId === parsed.messageId);
  if (!thread || !target || !thread.customer?.address) return { error: 'Item not found.' };
  const doc = (await loadEnquiries()).find((d) => keyOf(d) === thread.key);

  if (parsed.kind === 'new') {
    if (
      target.box !== 'inbox' ||
      waitingInbound(thread, doc, now)?.messageId !== target.messageId
    ) {
      return { error: 'Already handled.' };
    }
    return { idx, thread, target, doc };
  }
  const last = lastMessage(thread);
  if (
    target.box !== 'sent' ||
    last?.messageId !== target.messageId ||
    hasDraftAfter(thread, target.date)
  ) {
    return { error: 'Already handled.' };
  }
  if (parsed.kind === 'followUp') {
    const reason = doc ? followUpDue(doc, thread, now) : null;
    if (!reason) return { error: 'No follow-up due.' };
    return { idx, thread, target, doc, reason };
  }
  if (doc) return { error: 'Already tracked.' };
  return { idx, thread, target };
}

/** Untrusted text, fenced so it can't pass for anything else. */
const fence = (tag: string, text: string) =>
  `<${tag} untrusted="true">\n${text.replace(/<\/?\s*(customer_email|studio_reply)[^>]*>/gi, '[removed]')}\n</${tag}>`;

const firstName = (name?: string) =>
  name
    ?.trim()
    .split(/\s+/)[0]
    ?.replace(/[^\p{L}'-]/gu, '') || undefined;

export interface ItemPayload {
  id: string;
  kind: ItemKind;
  ticket: string;
  subject: string;
  customerFirstName?: string;
  viaContactForm: boolean;
  /** Oldest first. Customer text is fenced as untrusted. */
  thread: { from: 'customer' | 'studio'; date: string; text: string }[];
  customer: CustomerContext;
  enquiry: Pick<
    EnquiryDoc,
    'status' | 'topic' | 'followUps' | 'followUpOn' | 'followUpReason' | 'note'
  > | null;
  followUp?: { reason: FollowUpReason; christmasCutoff: string; madeToOrderLeadTime: string };
}

export async function item(id: string): Promise<ItemPayload | { error: string }> {
  return Mailbox.with(async (mb) => {
    const r = await resolve(mb, id);
    if ('error' in r) return r;
    const own = ownAddress();
    const history = [...r.thread.inbound, ...r.thread.sent]
      .filter((m) => m.date <= r.target.date)
      .sort((a, b) => a.date - b.date)
      .slice(-6);
    const thread: ItemPayload['thread'] = [];
    for (const m of history) {
      const text = newText(await mb.text(m.box, m.uid), m === r.target ? 8_000 : 3_000);
      thread.push(
        m.box === 'inbox'
          ? {
              from: 'customer',
              date: new Date(m.date).toISOString(),
              text: fence('customer_email', text),
            }
          : {
              from: 'studio',
              date: new Date(m.date).toISOString(),
              text: fence('studio_reply', text),
            }
      );
    }
    const firstInbound = r.thread.inbound[0];
    return {
      id,
      kind: parseItemId(id)!.kind,
      ticket: issueTicket(id),
      subject: (firstInbound ?? r.target).subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
      // The contact form's Reply-To carries no name; its subject does ("Cinque enquiry from Amy").
      customerFirstName: firstName(
        r.thread.customer?.name ||
          (firstInbound && isContactForm(firstInbound, own)
            ? /^Cinque enquiry from (.+?)(?: \(|$)/.exec(firstInbound.subject)?.[1]
            : undefined)
      ),
      viaContactForm: Boolean(firstInbound && isContactForm(firstInbound, own)),
      thread,
      customer: await customerContext(r.thread.customer!.address!),
      enquiry: r.doc
        ? {
            status: r.doc.status,
            topic: r.doc.topic,
            followUps: r.doc.followUps,
            followUpOn: r.doc.followUpOn,
            followUpReason: r.doc.followUpReason,
            note: r.doc.note,
          }
        : null,
      ...(r.reason
        ? {
            followUp: {
              reason: r.reason,
              christmasCutoff: CHRISTMAS_CUTOFF_LABEL,
              madeToOrderLeadTime: MADE_TO_ORDER_LEAD_TIME,
            },
          }
        : {}),
    };
  });
}

// ── Writing: a draft, and/or the tracker ──

export interface TrackInput {
  /** 'track' keeps it open for follow-ups; 'closed' stops them; 'ignored' = not a customer enquiry. */
  status?: 'track' | 'closed' | 'ignored';
  topic?: EnquiryTopic;
  /** "YYYY-MM-DD": follow up on this date (the customer asked to hear back then). */
  followUpOn?: string;
  followUpReason?: FollowUpReason;
  note?: string;
}

function trackFields(
  track: TrackInput | undefined,
  now: number
): { set: Partial<EnquiryDoc>; unset: string[] } {
  const set: Partial<EnquiryDoc> = {};
  const unset: string[] = [];
  if (!track) return { set, unset };
  if (track.topic) set.topic = track.topic;
  if (track.status === 'closed') set.status = 'closed';
  if (track.status === 'ignored') set.status = 'ignored';
  const note = cleanNote(track.note);
  if (note) set.note = note;
  if (track.followUpOn) {
    const max = new Date(now + 180 * DAY).toISOString().slice(0, 10);
    if (track.followUpOn <= max) {
      set.followUpOn = track.followUpOn;
      set.followUpReason = track.followUpReason ?? 'customerAskedLater';
    }
  }
  return { set, unset };
}

const fromName = (idx: MailIndex) =>
  idx.sentAll
    .slice()
    .sort((a, b) => b.date - a.date)
    .find((m) => m.from?.name)?.from?.name ?? 'Cinque';

export async function writeDraft(
  id: string,
  body: string,
  track?: TrackInput,
  now = Date.now()
): Promise<{ ok: true } | { error: string }> {
  return Mailbox.with(async (mb) => {
    const r = await resolve(mb, id, now);
    if ('error' in r) return r;
    const own = ownAddress();
    const kind = parseItemId(id)!.kind;
    if (kind === 'track') return { error: 'Tracking items take no draft.' };

    const contactForm = r.thread.inbound[0] ? isContactForm(r.thread.inbound[0], own) : false;
    const subject = contactForm ? 'Your enquiry to Cinque' : replySubject(r.target.subject);
    const mime = draftMime({
      from: { name: fromName(r.idx), address: own },
      // Always the customer on the thread, never anything the agent supplied.
      to: r.thread.customer!,
      subject,
      body: body.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 6_000),
      inReplyTo: r.target.messageId,
      references: [...r.target.references, r.target.messageId],
    });
    await mb.appendDraft(mime);

    const { set, unset } = trackFields(track, now);
    if (kind === 'followUp') {
      set.followUpDraftedAt = new Date(now).toISOString();
      if (r.reason === 'christmasCutoff') set.festiveSent = true;
      if (r.doc?.followUpOn) unset.push('followUpOn', 'followUpReason');
      await patchEnquiry(r.thread.key, r.thread, set, { unset, inc: { followUps: 1 } });
    } else {
      await patchEnquiry(r.thread.key, r.thread, set, {
        unset,
        handled: hashId(r.target.messageId),
      });
    }
    return { ok: true };
  });
}

/** Record a decision without drafting: not a customer, nothing to send, or how to track it. */
export async function writeTrack(
  id: string,
  track: TrackInput,
  now = Date.now()
): Promise<{ ok: true } | { error: string }> {
  return Mailbox.with(async (mb) => {
    const r = await resolve(mb, id, now);
    if ('error' in r) return r;
    const kind = parseItemId(id)!.kind;
    const { set, unset } = trackFields(track, now);
    if (kind === 'track' && !set.status) set.status = 'awaitingCustomer';
    // A follow-up declined without a new date: stop chasing this one.
    if (kind === 'followUp' && !set.status && !set.followUpOn) set.status = 'closed';
    await patchEnquiry(r.thread.key, r.thread, set, {
      unset,
      handled: kind === 'new' ? hashId(r.target.messageId) : undefined,
    });
    return { ok: true };
  });
}

// ── The studio's voice ──

const STREET =
  /\b(road|rd|street|st|avenue|ave|av|lane|ln|rue|strasse|straße|straat|calle|via|way|drive|close|court|place|square|boulevard|blvd|terrace|gardens|crescent|grove|mews|row|parade|walk|n°)\b/i;

/** A line that reads like part of a postal address (not the studio's own). */
function isAddressLine(line: string): boolean {
  if (/808 High R(oa)?d/i.test(line)) return false;
  const short = line.trim().length <= 80;
  const houseAndStreet = /\d/.test(line) && STREET.test(line);
  // Postal codes the UK pattern below misses: 4 to 6 digits not part of a price.
  // Years (2026) excepted.
  const postcode = /(?<![£$€\d.,])\b(?!(?:19|20)\d{2}\b)\d{4,6}\b(?![.,]\d)/.test(line);
  return short && (houseAndStreet || postcode);
}

/**
 * Strip anything identifying from a sent reply before it's used as an
 * example: the names on that conversation, greetings, emails, links, order
 * numbers, phone numbers, postcodes and address lines.
 */
export function redactExample(text: string, names: string[] = []): string {
  let out = text
    .split('\n')
    .map((l) => (isAddressLine(l) ? '[address]' : l))
    .join('\n')
    .replace(/(\[address\]\n?)+/g, '[address]\n');
  // Names as written in a sentence (capitalised), so "May" goes but "may" stays.
  for (const n of names) {
    if (n.length < 2) continue;
    const word = n[0].toUpperCase() + n.slice(1).toLowerCase();
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'gu'), '[name]');
  }
  return out
    .replace(
      /^(\s*(?:hi|hello|hey|dear|good (?:morning|afternoon|evening)))[ \t]+[^\n,!.]{1,40}/i,
      '$1 [name]'
    )
    .replace(/\S+@\S+\.\S+/g, '[email]')
    .replace(
      /https?:\/\/(?!(?:www\.)?(?:cinque\.studio|instagram\.com\/cinque\.made))\S+/gi,
      '[link]'
    )
    .replace(/\bCQ-\d{6}-[A-Z0-9]{8}\b/g, '[order number]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]')
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/g, '[postcode]');
}

/** The words of the names on a conversation, for redaction. */
function namesOf(t: Thread): string[] {
  const own = ownAddress().toLowerCase();
  const people = [
    ...t.inbound.flatMap((m) => [m.from, m.replyTo]),
    ...t.sent.flatMap((m) => m.to),
  ].filter((a) => a?.address && a.address.toLowerCase() !== own);
  const words = people.flatMap((a) => [
    ...(a!.name ?? '').split(/[\s,]+/),
    ...a!.address!.split('@')[0].split(/[._+-]+/),
  ]);
  // Contact-form subjects carry the visitor's name.
  const subject = /Cinque enquiry from ([^(]+)/.exec(t.inbound[0]?.subject ?? '')?.[1] ?? '';
  return [
    ...new Set(
      [...words, ...subject.split(/\s+/)].map((w) => w.trim()).filter((w) => w.length > 1)
    ),
  ];
}

let styleCache: { at: number; data: { fromName: string; examples: string[] } } | null = null;

/** Recent replies to customers, redacted, as examples of tone and format. */
export async function style(): Promise<{ fromName: string; examples: string[] }> {
  if (styleCache && Date.now() - styleCache.at < 30 * 60_000) return styleCache.data;
  // Conversations the agent judged not to be customer enquiries aren't examples.
  const ignored = new Set(
    (await loadEnquiries()).filter((d) => d.status === 'ignored').map((d) => keyOf(d))
  );
  const data = await Mailbox.with(async (mb) => {
    const idx = await buildIndex(mb);
    const own = ownAddress().toLowerCase();
    const replies = idx.threads
      .filter((t) => t.inbound.length && t.sent.length && !ignored.has(t.key))
      .flatMap((t) => t.sent.map((m) => ({ m, t })))
      .filter(({ m }) => m.to.some((a) => a.address?.toLowerCase() !== own))
      .sort((a, b) => b.m.date - a.m.date);
    const examples: string[] = [];
    for (const { m, t } of replies) {
      if (examples.length >= 15) break;
      const text = redactExample(newText(await mb.text('sent', m.uid), 1_500), namesOf(t));
      // The same reply is sometimes sent twice.
      // Short notes ("the rent has been transferred") aren't customer replies.
      if (text.length > 160 && !examples.includes(text)) examples.push(text);
    }
    return { fromName: fromName(idx), examples };
  });
  styleCache = { at: Date.now(), data };
  return data;
}
