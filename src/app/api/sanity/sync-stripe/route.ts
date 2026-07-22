import { NextResponse, type NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';
import { sanityWriteClient } from '@/lib/sanity/writeClient';
import { syncProductToStripe, type SyncProductInput } from '@/lib/stripe/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sanity → Stripe product/price sync.
 *
 * Configure a Sanity webhook (Manage → API → Webhooks) that:
 *  - triggers on create/update for `_type == "product"`
 *  - is signed with SANITY_STRIPE_SYNC_SECRET
 *  - POSTs here with this projection:
 *
 *      {
 *        _type, _id, title, status,
 *        variants[]{ _key, sku, metalType, priceGBP, stripeProductId, stripePriceId }
 *      }
 *
 * The sync creates/updates Stripe Products + Prices and writes the resulting
 * IDs back onto the variants. It is loop-safe: the write-back only happens when
 * an ID actually changed, so the follow-up webhook delivery is a no-op.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.SANITY_STRIPE_SYNC_SECRET;
  if (!secret) {
    console.error('[sync-stripe] SANITY_STRIPE_SYNC_SECRET is not configured');
    return NextResponse.json({ error: 'Sync not configured.' }, { status: 500 });
  }

  let payload: (SyncProductInput & { _type?: string }) | null = null;
  try {
    const { isValidSignature, body } = await parseBody<
      SyncProductInput & { _type?: string }
    >(req, secret);
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
    const patches = await syncProductToStripe(payload);

    if (patches.length > 0) {
      const tx = sanityWriteClient.transaction();
      for (const p of patches) {
        const set: Record<string, string> = {};
        if (p.stripeProductId) {
          set[`variants[_key=="${p._key}"].stripeProductId`] = p.stripeProductId;
        }
        if (p.stripePriceId) {
          set[`variants[_key=="${p._key}"].stripePriceId`] = p.stripePriceId;
        }
        tx.patch(payload._id, (patch) => patch.set(set));
      }
      await tx.commit({ autoGenerateArrayKeys: false });
    }

    return NextResponse.json({ synced: true, updatedVariants: patches.length });
  } catch (err) {
    console.error('[sync-stripe] sync failed', err);
    // 500 → Sanity retries the webhook delivery.
    return NextResponse.json({ error: 'Sync failed.' }, { status: 500 });
  }
}
