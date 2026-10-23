import { NextResponse } from 'next/server';
import { agentGuard, checkTicket } from '@/lib/inbox/auth';
import { writeDraft } from '@/lib/inbox/agent';
import { draftSchema } from '@/lib/inbox/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/agent/draft — save a reply as a DRAFT in the studio's Drafts
 * mailbox. Nothing is sent: there is no sending code. The recipient, subject
 * and threading come from the conversation itself, never from the request,
 * and the ticket ties the draft to the one item it was issued for.
 */
export async function POST(req: Request) {
  const denied = agentGuard(req, 'draft', 60);
  if (denied) return denied;
  const parsed = draftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, ticket, body, track } = parsed.data;
  if (!checkTicket(id, ticket))
    return NextResponse.json({ error: 'Invalid ticket.' }, { status: 403 });
  try {
    const result = await writeDraft(id, body, track);
    return NextResponse.json(result, { status: 'error' in result ? 409 : 200 });
  } catch (err) {
    console.error('[agent/draft]', err);
    return NextResponse.json({ error: 'Could not save the draft.' }, { status: 502 });
  }
}
