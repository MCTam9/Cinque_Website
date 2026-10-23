import { NextResponse } from 'next/server';
import { agentGuard } from '@/lib/inbox/auth';
import { queue } from '@/lib/inbox/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/agent/queue — the inbox agent's work list for this run: new
 * customer emails, follow-ups that are due, and conversations to start
 * tracking. Ids and kinds only, never message text, so the session that
 * reads this never sees what customers wrote (each item is handled in a
 * fresh sub-session that fetches just that one).
 */
export async function GET(req: Request) {
  const denied = agentGuard(req, 'queue', 12);
  if (denied) return denied;
  try {
    const items = await queue();
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[agent/queue]', err);
    return NextResponse.json({ error: 'Could not read the inbox.' }, { status: 502 });
  }
}
