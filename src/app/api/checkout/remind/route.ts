import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sessionId: z.string().regex(/^cs_(live|test)_[A-Za-z0-9]+$/),
  remind: z.boolean(),
});

/**
 * POST /api/checkout/remind — the opt-out tickbox on the payment step.
 *
 * Sets the open checkout's `remind` flag in place, so ticking it never
 * reloads Stripe's form (and loses what the buyer has typed). The webhook
 * reads the flag if the checkout expires unpaid (src/lib/stripe/cartReminder.ts).
 */
export async function POST(req: Request) {
  if (rateLimit(`checkout-remind:${clientIp(req)}`, { windowMs: 60_000, max: 20 })) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { sessionId, remind } = parsed.data;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== 'open') return NextResponse.json({ ok: false }, { status: 409 });
    await stripe.checkout.sessions.update(sessionId, { metadata: { remind: remind ? '1' : '0' } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[checkout-remind] failed', err);
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }
}
