import 'server-only';
import { createHash } from 'node:crypto';
import { serverEnv } from '@/lib/serverEnv';
import { Mailbox, type Address, type IndexedMessage } from './imap';
import { customerOf, isAutomated } from './filters';

/**
 * The mailbox as conversations: Inbox, Sent and Drafts indexed (headers
 * only) and grouped into threads by Message-ID / In-Reply-To / References.
 * Each thread gets a stable key, the hash of its first message's id, which
 * names its `enquiry.<key>` record.
 */

/** How far back conversations are read. Follow-ups are within weeks; this is ample. */
const LOOKBACK_DAYS = 120;

export interface Thread {
  key: string;
  messages: IndexedMessage[];
  /** Customer messages (Inbox, a person, not automated), oldest first. */
  inbound: IndexedMessage[];
  /** The studio's sent replies, oldest first. */
  sent: IndexedMessage[];
  drafts: IndexedMessage[];
  /** Who the conversation is with. */
  customer: Address | null;
}

export interface MailIndex {
  threads: Thread[];
  byKey: Map<string, Thread>;
  /** The thread a Message-ID belongs to. */
  byMessageId: Map<string, Thread>;
  sentAll: IndexedMessage[];
}

export const hashId = (id: string) => createHash('sha256').update(id).digest('hex').slice(0, 32);

/** The studio's address: drafts are From it, and mail from it is the studio's own. */
export const ownAddress = () => serverEnv.INBOX_ADDRESS ?? serverEnv.ICLOUD_IMAP_USER ?? '';

export async function buildIndex(mb: Mailbox): Promise<MailIndex> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
  const [inbox, sent, drafts] = await Promise.all([
    mb.index('inbox', since),
    mb.index('sent', since),
    mb.index('drafts', new Date(Date.now() - 365 * 86_400_000)),
  ]);
  return groupThreads([...inbox, ...sent, ...drafts]);
}

export function groupThreads(all: IndexedMessage[]): MailIndex {
  // Union-find over Message-IDs, linking each message to what it replies to.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    if (p !== x) {
      p = find(p);
      parent.set(x, p);
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const m of all) {
    parent.set(m.messageId, find(m.messageId));
    for (const ref of [...m.references, ...(m.inReplyTo ? [m.inReplyTo] : [])])
      union(m.messageId, ref);
  }

  const groups = new Map<string, IndexedMessage[]>();
  for (const m of all) {
    const root = find(m.messageId);
    groups.set(root, [...(groups.get(root) ?? []), m]);
  }

  const own = ownAddress();
  const threads: Thread[] = [];
  for (const msgs of groups.values()) {
    msgs.sort((a, b) => a.date - b.date);
    const first = msgs.find((m) => m.box !== 'drafts') ?? msgs[0];
    const rootId = first.references[0] ?? first.inReplyTo ?? first.messageId;
    const inbound = msgs.filter((m) => m.box === 'inbox' && !isAutomated(m) && customerOf(m, own));
    const sent = msgs.filter((m) => m.box === 'sent');
    const lastInbound = inbound.at(-1);
    const customer =
      (lastInbound && customerOf(lastInbound, own)) ??
      sent.at(-1)?.to.find((t) => t.address && t.address.toLowerCase() !== own.toLowerCase()) ??
      null;
    threads.push({
      key: hashId(rootId),
      messages: msgs,
      inbound,
      sent,
      drafts: msgs.filter((m) => m.box === 'drafts'),
      customer,
    });
  }

  const byKey = new Map(threads.map((t) => [t.key, t]));
  const byMessageId = new Map<string, Thread>();
  for (const t of threads) for (const m of t.messages) byMessageId.set(m.messageId, t);
  return { threads, byKey, byMessageId, sentAll: all.filter((m) => m.box === 'sent') };
}

/** Inbound or sent, whichever came last (drafts aside). */
export function lastMessage(t: Thread): IndexedMessage | undefined {
  return [...t.inbound, ...t.sent].sort((a, b) => a.date - b.date).at(-1);
}

/** Whether there's a draft in the thread newer than `after` (ms). */
export function hasDraftAfter(t: Thread, after: number): boolean {
  return t.drafts.some((d) => d.date >= after - 60_000);
}

/** Whether `m` has been replied to: a later sent message, or Mail's Answered flag. */
export function isAnswered(t: Thread, m: IndexedMessage): boolean {
  return m.flags.has('\\Answered') || t.sent.some((s) => s.date > m.date);
}
