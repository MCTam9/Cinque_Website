import { NextResponse } from 'next/server';
import { agentGuard, checkTicket } from '@/lib/inbox/auth';
import { reviseDraft, reviseTicketId } from '@/lib/inbox/agent';
import { reviseSchema } from '@/lib/inbox/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/agent/revise — replace one of the agent's drafts with a revised
 * version, when Cindy asks for changes. The new draft is saved first; the old
 * one is removed only if it is still the agent's, word for word, so a draft
 * Cindy has edited in Mail is never touched. Nothing is sent.
 */
export async function POST(req: Request) {
  const denied = agentGuard(req, 'revise', 60);
  if (denied) return denied;
  const parsed = reviseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, ticket, body, track } = parsed.data;
  if (!checkTicket(reviseTicketId(id), ticket)) {
    return NextResponse.json({ error: 'Invalid ticket.' }, { status: 403 });
  }
  try {
    const result = await reviseDraft(id, body, track);
    return NextResponse.json(result, { status: 'error' in result ? 409 : 200 });
  } catch (err) {
    console.error('[agent/revise]', err);
    return NextResponse.json({ error: 'Could not revise the draft.' }, { status: 502 });
  }
}
