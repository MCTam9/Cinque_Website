import { NextResponse } from 'next/server';
import { agentGuard } from '@/lib/inbox/auth';
import { agentDrafts } from '@/lib/inbox/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/agent/drafts — the agent's drafts still waiting in Drafts, as
 * written (not yet edited in Mail), so Cindy can ask for one to be revised.
 * Item id, first name, subject and when it was drafted; no message text.
 */
export async function GET(req: Request) {
  const denied = agentGuard(req, 'drafts', 30);
  if (denied) return denied;
  try {
    return NextResponse.json(
      { drafts: await agentDrafts() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[agent/drafts]', err);
    return NextResponse.json({ error: 'Could not read Drafts.' }, { status: 502 });
  }
}
