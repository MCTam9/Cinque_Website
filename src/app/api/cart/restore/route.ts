import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { cartFromSession, verifyRestore } from '@/lib/stripe/cartReminder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cart/restore?s=cs_...&t=<signature>
 *
 * The reminder email's "Return to checkout" link: rebuilds the expired
 * checkout's cart at today's prices for /cart/restore to load. The signature
 * means only the link we emailed works. The email address comes back too so
 * checkout can fill it in; the link was sent to that address.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('s') ?? '';
  if (
    !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId) ||
    !verifyRestore(sessionId, searchParams.get('t'))
  ) {
    return NextResponse.json({ error: 'This link isn’t valid.' }, { status: 400 });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const lines = await cartFromSession(session);
    if (!lines.length) {
      return NextResponse.json(
        { error: 'The pieces from this checkout are no longer available.' },
        { status: 410 },
      );
    }
    return NextResponse.json({
      lines,
      email: session.customer_email ?? null,
      country: session.shipping_address_collection?.allowed_countries?.[0] ?? null,
      recoveredFrom: session.id,
    });
  } catch (err) {
    console.error('[cart-restore] failed', err);
    return NextResponse.json({ error: 'We couldn’t restore this checkout.' }, { status: 500 });
  }
}
