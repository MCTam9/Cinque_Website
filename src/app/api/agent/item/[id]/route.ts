import { NextResponse } from 'next/server';
import { agentGuard } from '@/lib/inbox/auth';
import { item, revisionItem } from '@/lib/inbox/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/agent/item/:id — one queue item: the conversation (customer text
 * fenced as untrusted), that customer's own orders, the enquiry record, and a
 * ticket that lets exactly one draft be written for this item.
 *
 * With ?revise=1: the same for an item the agent has already drafted, plus
 * that draft's text and a ticket for /api/agent/revise.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = agentGuard(req, 'item', 120);
  if (denied) return denied;
  const { id } = await params;
  try {
    const revise = new URL(req.url).searchParams.get('revise') === '1';
    const result = revise ? await revisionItem(id) : await item(id);
    if ('error' in result) return NextResponse.json(result, { status: 404 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[agent/item]', err);
    return NextResponse.json({ error: 'Could not read the item.' }, { status: 502 });
  }
}
