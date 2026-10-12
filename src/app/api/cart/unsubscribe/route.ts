import { NextResponse } from 'next/server';
import { optOut, verifyUnsubscribe } from '@/lib/stripe/cartReminder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/unsubscribe?e=<email key>&t=<signature>
 *
 * Stops checkout reminders for an address. Called by the /unsubscribe page's
 * button and by mail clients' one-click unsubscribe (List-Unsubscribe-Post).
 * POST only: link scanners that open every URL in an email would otherwise
 * unsubscribe people by accident.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('e') ?? '';
  if (!verifyUnsubscribe(key, searchParams.get('t'))) {
    return NextResponse.json({ error: 'This link isn’t valid.' }, { status: 400 });
  }
  try {
    await optOut(key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[unsubscribe] failed', err);
    return NextResponse.json({ error: 'Please try again.' }, { status: 500 });
  }
}
