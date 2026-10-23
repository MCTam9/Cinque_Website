import { NextResponse } from 'next/server';
import { agentGuard } from '@/lib/inbox/auth';
import { style } from '@/lib/inbox/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/agent/style — the studio's recent replies to customers, with
 * names, emails, numbers and links blanked out, as examples of tone and
 * format for the drafts.
 */
export async function GET(req: Request) {
  const denied = agentGuard(req, 'style', 60);
  if (denied) return denied;
  try {
    return NextResponse.json(await style(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[agent/style]', err);
    return NextResponse.json({ error: 'Could not read sent mail.' }, { status: 502 });
  }
}
