import 'server-only';
import { ImapFlow, type ListResponse, type MessageStructureObject } from 'imapflow';
import { serverEnv } from '@/lib/serverEnv';

/**
 * The studio mailbox (iCloud Mail) over IMAP, for the inbox agent.
 *
 * Read and draft only. Inbox and Sent are opened read-only (EXAMINE) and
 * bodies are fetched with BODY.PEEK, so nothing is marked read, flagged or
 * moved. The writes are APPENDing a draft to the Drafts mailbox, and, when a
 * draft is revised, deleting the agent's own previous draft: one that still
 * carries its seal and is word for word what the agent wrote, so a draft Cindy
 * has edited (or any other message) can never be removed. There is
 * deliberately no SMTP here, or anywhere in this codebase's inbox code:
 * nothing the agent does can send an email.
 */

const HOST = 'imap.mail.me.com';

export function inboxConfigured(): boolean {
  return Boolean(serverEnv.ICLOUD_IMAP_USER && serverEnv.ICLOUD_IMAP_PASSWORD);
}

export interface Address {
  name?: string;
  address?: string;
}

export interface IndexedMessage {
  box: 'inbox' | 'sent' | 'drafts';
  uid: number;
  /** With angle brackets, as in headers: "<abc@host>". */
  messageId: string;
  /** Epoch ms. */
  date: number;
  subject: string;
  from?: Address;
  replyTo?: Address;
  to: Address[];
  inReplyTo?: string;
  references: string[];
  flags: Set<string>;
  /** Lower-cased names of the few headers the filters read. */
  headers: Record<string, string>;
}

/** Set on the agent's drafts: "v1.<seal of the body>" (see sealDraft in auth.ts). */
export const AGENT_DRAFT_HEADER = 'x-cinque-agent-draft';

const INDEX_HEADERS = [
  'references',
  'in-reply-to',
  'list-unsubscribe',
  'list-id',
  'auto-submitted',
  'precedence',
  'x-auto-response-suppress',
  AGENT_DRAFT_HEADER,
];

const MESSAGE_ID = /<[^<>\s]+>/g;

/** "<a@b> <c@d>" (folded or not) → ["<a@b>", "<c@d>"]. */
export const messageIds = (value?: string) => value?.match(MESSAGE_ID) ?? [];

function parseHeaders(raw?: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  // Unfold continuation lines, then "Name: value" per line.
  for (const line of raw
    .toString('utf8')
    .replace(/\r?\n[ \t]+/g, ' ')
    .split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}

export interface Mailboxes {
  inbox: string;
  sent: string;
  drafts: string;
}

function findBox(list: ListResponse[], use: string, names: string[]): string | undefined {
  return (
    list.find((b) => b.specialUse === use)?.path ??
    list.find((b) => names.some((n) => n.toLowerCase() === b.path.toLowerCase()))?.path
  );
}

export class Mailbox {
  private constructor(
    readonly client: ImapFlow,
    readonly boxes: Mailboxes
  ) {}

  /** Open a connection, run `fn`, always log out. */
  static async with<T>(fn: (mb: Mailbox) => Promise<T>): Promise<T> {
    if (!inboxConfigured()) throw new Error('Inbox not configured');
    const client = new ImapFlow({
      host: HOST,
      port: 993,
      secure: true,
      auth: { user: serverEnv.ICLOUD_IMAP_USER!, pass: serverEnv.ICLOUD_IMAP_PASSWORD! },
      logger: false,
      disableAutoIdle: true,
    });
    await client.connect();
    try {
      const list = await client.list();
      const boxes: Mailboxes = {
        inbox: 'INBOX',
        // iCloud's own names, should SPECIAL-USE ever be missing.
        sent: findBox(list, '\\Sent', ['Sent Messages', 'Sent']) ?? 'Sent Messages',
        drafts: findBox(list, '\\Drafts', ['Drafts']) ?? 'Drafts',
      };
      return await fn(new Mailbox(client, boxes));
    } finally {
      await client.logout().catch(() => client.close());
    }
  }

  /** Every message in `box` since `since`, headers only. Read-only. */
  async index(box: keyof Mailboxes, since: Date): Promise<IndexedMessage[]> {
    const lock = await this.client.getMailboxLock(this.boxes[box], { readOnly: true });
    try {
      const uids = await this.client.search({ since }, { uid: true });
      if (!uids || uids.length === 0) return [];
      const rows = await this.client.fetchAll(
        uids,
        { uid: true, envelope: true, flags: true, internalDate: true, headers: INDEX_HEADERS },
        { uid: true }
      );
      return rows.flatMap((m): IndexedMessage[] => {
        const env = m.envelope;
        if (!env?.messageId) return [];
        const headers = parseHeaders(m.headers);
        const date = new Date(env.date ?? m.internalDate ?? 0).getTime();
        return [
          {
            box,
            uid: m.uid,
            messageId: env.messageId,
            date: Number.isFinite(date) ? date : 0,
            subject: env.subject ?? '',
            from: env.from?.[0],
            replyTo: env.replyTo?.[0],
            to: env.to ?? [],
            inReplyTo: messageIds(env.inReplyTo ?? headers['in-reply-to'])[0],
            references: messageIds(headers.references),
            flags: m.flags ?? new Set(),
            headers,
          },
        ];
      });
    } finally {
      lock.release();
    }
  }

  /** A message's readable text: its plain-text part, else its HTML as text. */
  async text(box: keyof Mailboxes, uid: number, maxBytes = 64_000): Promise<string> {
    const lock = await this.client.getMailboxLock(this.boxes[box], { readOnly: true });
    try {
      return await this.readText(uid, maxBytes);
    } finally {
      lock.release();
    }
  }

  /** The text of `uid` in the mailbox already selected. */
  private async readText(uid: number, maxBytes = 64_000): Promise<string> {
    const msg = await this.client.fetchOne(String(uid), { bodyStructure: true }, { uid: true });
    if (!msg || !msg.bodyStructure) return '';
    const part = pickTextPart(msg.bodyStructure);
    if (!part) return '';
    const dl = await this.client.download(String(uid), part.part ?? '1', { uid: true, maxBytes });
    if (!dl.content) return '';
    const chunks: Buffer[] = [];
    for await (const chunk of dl.content) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString('utf8');
    return part.type === 'text/html' ? htmlToText(raw) : raw;
  }

  /**
   * Delete one of the agent's own drafts, being replaced by a revision. Only
   * in Drafts, only a \Draft carrying the agent's header, and only if
   * `isUnchanged(header, text)` confirms it's exactly what the agent wrote.
   * Anything else is left alone. Returns whether it was deleted.
   */
  async deleteAgentDraft(
    uid: number,
    isUnchanged: (header: string, text: string) => boolean
  ): Promise<boolean> {
    const lock = await this.client.getMailboxLock(this.boxes.drafts);
    try {
      const msg = await this.client.fetchOne(
        String(uid),
        { uid: true, flags: true, headers: [AGENT_DRAFT_HEADER] },
        { uid: true }
      );
      if (!msg || !msg.flags?.has('\\Draft')) return false;
      const header = parseHeaders(msg.headers)[AGENT_DRAFT_HEADER];
      if (!header || !isUnchanged(header, await this.readText(uid))) return false;
      return await this.client.messageDelete(String(uid), { uid: true });
    } finally {
      lock.release();
    }
  }

  /** Save `mime` as a draft. Nothing is ever sent. */
  async appendDraft(mime: string): Promise<void> {
    const res = await this.client.append(this.boxes.drafts, mime, ['\\Draft', '\\Seen']);
    if (!res) throw new Error('Could not save the draft');
  }
}

function pickTextPart(node: MessageStructureObject): MessageStructureObject | null {
  const parts: MessageStructureObject[] = [];
  const walk = (n: MessageStructureObject) => {
    if (n.childNodes?.length) n.childNodes.forEach(walk);
    else if (n.disposition !== 'attachment') parts.push(n);
  };
  walk(node);
  return (
    parts.find((p) => p.type === 'text/plain') ?? parts.find((p) => p.type === 'text/html') ?? null
  );
}

/** Just enough HTML → text for emails: breaks kept, tags and entities gone. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&amp;/g, '&')
    // Template indentation: trim every line, then collapse runs of blank lines.
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
