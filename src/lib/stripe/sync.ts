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
 *  - A variant only uses a Stripe Product whose metadata names it (Sanity
 *    product id + variant key). Duplicating a product in the Studio copies the
 *    read-only Stripe IDs too, and before this check every copy reused — and
 *    renamed, repriced and archived prices on — the original's Product. A
 *    variant holding someone else's Product now gets its own, and never
 *    touches the other one.
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

/** Whether a Stripe Product belongs to this Sanity product + variant. */
export function ownsProduct(
  p: import('stripe').Stripe.Product,
  sanityProductId: string,
  variantKey: string
): boolean {
  return p.metadata?.sanityProductId === sanityProductId && p.metadata?.variantKey === variantKey;
}

function defaultPriceId(p: import('stripe').Stripe.Product): string | null {
  const d = p.default_price;
  return typeof d === 'string' ? d : (d?.id ?? null);
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

    // ── 1. Ensure this variant has its OWN Stripe Product (and name/active).
    let existing: import('stripe').Stripe.Product | null = null;
    if (variant.stripeProductId) {
      try {
        existing = await stripe.products.retrieve(variant.stripeProductId);
      } catch {
        // Referenced product vanished (e.g. deleted in Stripe) — recreate below.
      }
    }
    if (existing && !ownsProduct(existing, product._id, variant._key)) existing = null;

    let stripeProductId: string;
    if (existing) {
      stripeProductId = existing.id;
      if (existing.name !== name || existing.active !== isActive) {
        await stripe.products.update(stripeProductId, { name, active: isActive, metadata });
      }
    } else {
      const created = await stripe.products.create({ name, active: isActive, metadata });
      stripeProductId = created.id;
      patch.stripeProductId = created.id;
    }

    // ── 2. Ensure an active Price, on this Product, matching priceGBP.
    let needNewPrice = true;
    let oldPriceIsOurs = false;
    if (variant.stripePriceId) {
      try {
        const price = await stripe.prices.retrieve(variant.stripePriceId);
        const priceProduct = typeof price.product === 'string' ? price.product : price.product.id;
        oldPriceIsOurs = priceProduct === stripeProductId;
        if (
          oldPriceIsOurs &&
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
      // Archive the superseded price (kept working for in-flight sessions) —
      // only if it was ours; another variant may still be charging with it.
      if (variant.stripePriceId && oldPriceIsOurs) {
        try {
          await stripe.prices.update(variant.stripePriceId, { active: false });
        } catch {
          /* best-effort archive */
        }
      }
      patch.stripePriceId = newPrice.id;
    } else if (existing && defaultPriceId(existing) !== variant.stripePriceId) {
      // A copy may have moved the default elsewhere; point it back.
      await stripe.products.update(stripeProductId, { default_price: variant.stripePriceId });
    }

    // Only emit a patch when something actually changed (loop protection).
    if (patch.stripeProductId || patch.stripePriceId) {
      patches.push(patch);
    }
  }

  return patches;
}
