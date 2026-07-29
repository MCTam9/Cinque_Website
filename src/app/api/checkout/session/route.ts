import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mask an address for display: `jane.doe@gmail.com` → `j•••@gmail.com`.
 *
 * The return page shows this so a buyer can confirm WHICH of their addresses
 * the receipt is going to. That only needs recognisability, not the address
 * itself — see the note on the route below for why the difference matters.
 */
function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '•••'; // no local part to mask — reveal nothing
  return `${email[0]}•••${email.slice(at)}`;
}

/**
 * GET /api/checkout/session?session_id=cs_...
 * Used by the /checkout/return page to display the outcome.
 *
 * UNAUTHENTICATED BY DESIGN — Stripe's return_url hands the session id to the
 * browser, so there is no session/cookie to check against. That means anyone
 * holding an id can call this, and session ids do NOT stay private: they ride
 * in the return URL, so they land in browser history, Referer headers and
 * analytics. The address is therefore masked rather than returned. Do not add
 * raw email, name, phone or address fields here — put them behind the Studio,
 * which is authenticated.
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
      customerEmailMasked: session.customer_details?.email
        ? maskEmail(session.customer_details.email)
        : null,
    });
  } catch (err) {
    console.error('[checkout/session] retrieve failed', err);
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }
}
