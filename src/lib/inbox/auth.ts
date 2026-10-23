import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/serverEnv';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { inboxConfigured } from './imap';

/**
 * Auth for /api/agent/*: the cloud agent's bearer token (held by Anthropic's
 * proxy as a network secret, so the agent itself never sees it), plus
 * per-item draft tickets so a draft can only be written for the item the
 * agent was handed.
 */

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** A response to return straight away, or null when the caller may proceed. */
export function agentGuard(req: Request, bucket: string, max = 60): NextResponse | null {
  if (rateLimit(`agent-${bucket}:${clientIp(req)}`, { windowMs: 60 * 60_000, max })) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const token = serverEnv.INBOX_AGENT_TOKEN;
  const given = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/)?.[1] ?? '';
  if (!token || !given || !safeEqual(given, token)) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  if (!inboxConfigured()) {
    return NextResponse.json({ error: 'The inbox is not connected.' }, { status: 503 });
  }
  return null;
}

const TICKET_TTL_MS = 60 * 60_000;

function sign(itemId: string, exp: number): string {
  const key = createHmac('sha256', serverEnv.INBOX_AGENT_TOKEN ?? '')
    .update('draft-ticket')
    .digest();
  return createHmac('sha256', key).update(`${itemId}.${exp}`).digest('base64url');
}

/** A ticket that lets one draft be written for `itemId`, for the next hour. */
export function issueTicket(itemId: string): string {
  const exp = Date.now() + TICKET_TTL_MS;
  return `${exp}.${sign(itemId, exp)}`;
}

export function checkTicket(itemId: string, ticket: string): boolean {
  const [expText, sig] = ticket.split('.');
  const exp = Number(expText);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  return safeEqual(sig, sign(itemId, exp));
}

// ── Draft seals ──

/** The draft body as compared: line endings and outer whitespace don't count. */
const normalise = (body: string) => body.replace(/\r\n?/g, '\n').trim();

function sealKey(): Buffer {
  return createHmac('sha256', serverEnv.INBOX_AGENT_TOKEN ?? '')
    .update('draft-seal')
    .digest();
}

/** "v1.<HMAC of the body>": marks a draft as the agent's, exactly as written. */
export function sealDraft(body: string): string {
  return `v1.${createHmac('sha256', sealKey()).update(normalise(body)).digest('base64url')}`;
}

/** Whether a draft still carries the agent's seal and its words are unchanged. */
export function isSealedUnchanged(header: string, body: string): boolean {
  return safeEqual(header.trim(), sealDraft(body));
}
