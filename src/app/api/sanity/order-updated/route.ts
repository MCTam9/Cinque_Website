import { NextResponse, type NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';
import { sanityWriteClient } from '@/lib/sanity/writeClient';
import { sendShippingConfirmation } from '@/lib/fulfillment/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Order-update automation. When a staff member sets an order's status to
 * "Shipped" (and fills in a tracking number) in the Studio, this emails the
 * customer their shipping confirmation — one dropdown, zero technical steps.
 *
 * Configure a Sanity webhook:
 *  - Trigger on: Update  ·  Filter: `_type == "order"`
 *  - Signed with SANITY_ORDER_WEBHOOK_SECRET
 *  - Projection:
 *      {
 *        _type, _id, orderNumber, status,
 *        "email": customer.email,
 *        "carrier": fulfillment.carrier,
 *        "tracking": fulfillment.trackingNumber,
 *        "sentAt": fulfillment.shippedEmailSentAt
 *      }
 *
 * Loop-safe: the one-time write-back of shippedEmailSentAt makes the follow-up
 * delivery a no-op, so the customer is never emailed twice.
 */
interface OrderWebhookBody {
  _type?: string;
  _id?: string;
  orderNumber?: string;
  status?: string;
  email?: string | null;
  carrier?: string | null;
  tracking?: string | null;
  sentAt?: string | null;
}

export async function POST(req: NextRequest) {
  const secret = serverEnv.SANITY_ORDER_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[order-updated] SANITY_ORDER_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  let body: OrderWebhookBody | null = null;
  try {
    const parsed = await parseBody<OrderWebhookBody>(req, secret);
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

  // Only act on the shipped transition, once, and only with a tracking number.
  const shouldEmail =
    body.status === 'shipped' && !!body.tracking && !body.sentAt;

  if (!shouldEmail) {
    return NextResponse.json({ handled: false });
  }

  try {
    const result = await sendShippingConfirmation({
      to: body.email,
      orderNumber: body.orderNumber ?? '',
      carrier: body.carrier,
      trackingNumber: body.tracking,
    });

    // Stamp the guard so we never email twice (also stops the webhook loop).
    await sanityWriteClient
      .patch(body._id)
      .set({ 'fulfillment.shippedEmailSentAt': new Date().toISOString() })
      .commit();

    return NextResponse.json({ handled: true, emailed: result.ok });
  } catch (err) {
    console.error('[order-updated] failed', err);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
