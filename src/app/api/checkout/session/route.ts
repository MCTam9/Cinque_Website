import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/checkout/session?session_id=cs_...
 * Used by the /checkout/return page to display the outcome. Returns only
 * non-sensitive status fields.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id.' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return NextResponse.json({
      status: session.status, // open | complete | expired
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email ?? null,
    });
  } catch (err) {
    console.error('[checkout/session] retrieve failed', err);
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }
}
