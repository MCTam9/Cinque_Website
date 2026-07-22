import 'server-only';
import { stripe } from '@/lib/stripe';

/**
 * ─────────────────────────────────────────────────────────────
 * STRIPE PRODUCT / PRICE SYNC
 * ─────────────────────────────────────────────────────────────
 * Given a Sanity product (with variants), ensure every variant has a matching
 * Stripe Product and an active Stripe Price, and report back which variants
 * need their Stripe IDs written into Sanity.
 *
 * Design:
 *  - ONE Stripe Product per variant (SKU). Each SKU is a distinct purchasable
 *    unit with its own price, so this maps cleanly.
 *  - Stripe Prices are IMMUTABLE (amount/currency can't change). To "change" a
 *    price we create a new Price, point the Product's default_price at it, and
 *    archive the old Price. The old Price keeps working for any in-flight
 *    checkout sessions; new sessions use the new one.
 *  - The function is idempotent and loop-safe: it returns a patch for a variant
 *    ONLY when a Stripe ID was created or changed. When nothing changed it
 *    returns no patch, so the write-back doesn't retrigger an endless
 *    webhook → sync → write loop.
 */

export interface SyncVariantInput {
  _key: string;
  sku?: string;
  metalType?: string;
  priceGBP?: number; // pence
  stripeProductId?: string;
  stripePriceId?: string;
}

export interface SyncProductInput {
  _id: string;
  title: string;
  status: string; // 'active' | 'draft' | 'sold_out' | 'archived'
  variants?: SyncVariantInput[];
}

/** IDs to write back onto a specific variant in Sanity. */
export interface VariantPatch {
  _key: string;
  stripeProductId?: string;
  stripePriceId?: string;
}

export async function syncProductToStripe(
  product: SyncProductInput
): Promise<VariantPatch[]> {
  const patches: VariantPatch[] = [];
  const isActive = product.status === 'active';

  for (const variant of product.variants ?? []) {
    // Skip incomplete variants — can't price something without a SKU + amount.
    if (!variant.sku || typeof variant.priceGBP !== 'number') continue;

    const patch: VariantPatch = { _key: variant._key };
    const name = `${product.title} — ${variant.sku}`;
    const metadata: Record<string, string> = {
      sanityProductId: product._id,
      variantKey: variant._key,
      sku: variant.sku,
    };

    // ── 1. Ensure the Stripe Product exists (and reflects name/active state).
    let stripeProductId = variant.stripeProductId;
    if (!stripeProductId) {
      const created = await stripe.products.create({ name, active: isActive, metadata });
      stripeProductId = created.id;
      patch.stripeProductId = created.id;
    } else {
      try {
        const existing = await stripe.products.retrieve(stripeProductId);
        if (existing.name !== name || existing.active !== isActive) {
          await stripe.products.update(stripeProductId, { name, active: isActive, metadata });
        }
      } catch {
        // Referenced product vanished (e.g. deleted in Stripe) — recreate.
        const recreated = await stripe.products.create({ name, active: isActive, metadata });
        stripeProductId = recreated.id;
        patch.stripeProductId = recreated.id;
      }
    }

    // ── 2. Ensure an active Price matching priceGBP.
    let needNewPrice = true;
    if (variant.stripePriceId) {
      try {
        const price = await stripe.prices.retrieve(variant.stripePriceId);
        if (
          price.active &&
          price.currency === 'gbp' &&
          price.unit_amount === variant.priceGBP
        ) {
          needNewPrice = false;
        }
      } catch {
        // Price missing — fall through and create a new one.
      }
    }

    if (needNewPrice) {
      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: variant.priceGBP,
        currency: 'gbp',
      });
      // Point the product's default price at the new one.
      await stripe.products.update(stripeProductId, { default_price: newPrice.id });
      // Archive the superseded price (kept working for in-flight sessions).
      if (variant.stripePriceId) {
        try {
          await stripe.prices.update(variant.stripePriceId, { active: false });
        } catch {
          /* best-effort archive */
        }
      }
      patch.stripePriceId = newPrice.id;
    }

    // Only emit a patch when something actually changed (loop protection).
    if (patch.stripeProductId || patch.stripePriceId) {
      patches.push(patch);
    }
  }

  return patches;
}
