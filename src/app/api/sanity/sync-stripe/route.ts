import { NextResponse, type NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';
import { syncProduct, type SanityWebhookBody } from '@/lib/sanity/webhookHandlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sanity → Stripe product/price sync, on its own endpoint.
 *
 * On Sanity's free plan (two webhooks) you don't need this: /api/sanity/hook
 * runs the same `syncProduct` for product documents. This endpoint stays for
 * setups that split the jobs across separate webhooks.
 *
 *   Trigger:    create/update, filter `_type == "product"`
 *   Secret:     SANITY_STRIPE_SYNC_SECRET
 *   Projection: { _type, _id, title, status,
 *                 variants[]{ _key, sku, metalType, priceGBP,
 *                             stripeProductId, stripePriceId } }
 *
 * Loop-safe: IDs are written back only when one actually changed, so the
 * follow-up webhook delivery is a no-op.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.SANITY_STRIPE_SYNC_SECRET || serverEnv.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[sync-stripe] SANITY_STRIPE_SYNC_SECRET is not configured');
    return NextResponse.json({ error: 'Sync not configured.' }, { status: 500 });
  }

  let payload: SanityWebhookBody | null = null;
  try {
    const { isValidSignature, body } = await parseBody<SanityWebhookBody>(req, secret);
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
    payload = body;
  } catch (err) {
    console.error('[sync-stripe] could not parse body', err);
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  // Only products are synced.
  if (payload?._type !== 'product' || !payload._id) {
    return NextResponse.json({ synced: false, skipped: true });
  }

  try {
    const updatedVariants = await syncProduct(payload);
    return NextResponse.json({ synced: true, updatedVariants });
  } catch (err) {
    console.error('[sync-stripe] sync failed', err);
    // 500 → Sanity retries the webhook delivery.
    return NextResponse.json({ error: 'Sync failed.' }, { status: 500 });
  }
}
