import { NextResponse } from 'next/server';
import { agentGuard, checkTicket } from '@/lib/inbox/auth';
import { writeTrack } from '@/lib/inbox/agent';
import { trackBodySchema } from '@/lib/inbox/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/agent/track — record a decision without drafting: not a customer
 * enquiry, nothing to send, or how a conversation should be followed up.
 */
export async function POST(req: Request) {
  const denied = agentGuard(req, 'track', 60);
  if (denied) return denied;
  const parsed = trackBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, ticket, track } = parsed.data;
  if (!checkTicket(id, ticket))
    return NextResponse.json({ error: 'Invalid ticket.' }, { status: 403 });
  try {
    const result = await writeTrack(id, track);
    return NextResponse.json(result, { status: 'error' in result ? 409 : 200 });
  } catch (err) {
    console.error('[agent/track]', err);
    return NextResponse.json({ error: 'Could not save.' }, { status: 502 });
  }
}
