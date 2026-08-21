import { NextResponse, type NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';
import { handleOrderUpdate, type SanityWebhookBody } from '@/lib/sanity/webhookHandlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Order-update automation, on its own endpoint. When a staff member sets an
 * order's status to "Shipped" (and fills in a tracking number) in the Studio,
 * this emails the customer their shipping confirmation.
 *
 * On Sanity's free plan (two webhooks) you don't need this: /api/sanity/hook
 * runs the same `handleOrderUpdate` for order documents. This endpoint stays
 * for setups that split the jobs across separate webhooks.
 *
 *   Trigger:    update, filter `_type == "order"`
 *   Secret:     SANITY_ORDER_WEBHOOK_SECRET
 *   Projection: { _type, _id, orderNumber, status, stripeSessionId,
 *                 "carrier": fulfillment.carrier,
 *                 "tracking": fulfillment.trackingNumber,
 *                 "sentAt": fulfillment.shippedEmailSentAt }
 *
 * Loop-safe: the one-time write-back of shippedEmailSentAt makes the follow-up
 * delivery a no-op, so the customer is never emailed twice.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.SANITY_ORDER_WEBHOOK_SECRET || serverEnv.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[order-updated] SANITY_ORDER_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  let body: SanityWebhookBody | null = null;
  try {
    const parsed = await parseBody<SanityWebhookBody>(req, secret);
    if (!parsed.isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
    body = parsed.body;
  } catch (err) {
    console.error('[order-updated] parse error', err);
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  if (body?._type !== 'order' || !body._id) {
    return NextResponse.json({ handled: false, skipped: true });
  }

  try {
    const emailed = await handleOrderUpdate(body);
    return NextResponse.json({ handled: emailed, emailed });
  } catch (err) {
    console.error('[order-updated] failed', err);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
