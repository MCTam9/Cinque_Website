/**
 * Backfill: sync the whole Sanity catalog into Stripe.
 *
 *   node scripts/sync-stripe-catalog.mjs --dry-run   # report only
 *   node scripts/sync-stripe-catalog.mjs             # apply
 *
 * The `/api/sanity/sync-stripe` webhook does this one product at a time when
 * staff save a product. This script is the catch-up pass for products that
 * existed before the webhook was configured (or while it was misconfigured) —
 * without it those variants have no stripePriceId and cannot be checked out.
 *
 * Deliberately mirrors src/lib/stripe/sync.ts: one Stripe Product per variant
 * (SKU), prices are immutable so a changed amount creates a new Price, points
 * the Product's default_price at it and archives the old one. Idempotent — a
 * second run makes no writes.
 *
 * Like the webhook, a variant only keeps a Stripe Product whose metadata names
 * it: a product duplicated in the Studio carries the original's IDs, and gets
 * its own Product + Price here. Because this script sees the whole catalog it
 * also archives a superseded Price once no variant references it any more.
 *
 * Reads credentials from .env.local. Whether this touches TEST or LIVE Stripe
 * data is decided entirely by STRIPE_SECRET_KEY; the script prints which.
 */
import fs from 'node:fs';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// ── Load .env.local ──────────────────────────────────────────
const envText = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
}

const DRY_RUN = process.argv.includes('--dry-run');

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const sanityToken = process.env.SANITY_API_WRITE_TOKEN;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!projectId || !sanityToken || !stripeKey) {
  console.error(
    'Missing NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_WRITE_TOKEN or STRIPE_SECRET_KEY in .env.local'
  );
  process.exit(1);
}

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: '2024-10-01',
  token: sanityToken,
  useCdn: false, // a backfill must read the current truth, never a cached copy
});

const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });

const mode = stripeKey.startsWith('sk_live') ? 'LIVE' : 'TEST';
const gbp = (pence) => `£${(pence / 100).toFixed(2)}`;

console.log(
  `\nSanity ${projectId}/${dataset}  →  Stripe ${mode}${DRY_RUN ? '  (dry run — no writes)' : ''}\n`
);

// Published products only: drafts are not purchasable, and the storefront
// reads with perspective 'published'.
const products = await sanity.fetch(
  `*[_type == "product" && !(_id in path("drafts.**"))] | order(title asc){
     _id, title, status,
     variants[]{ _key, sku, metalType, priceGBP, stripeProductId, stripePriceId }
   }`
);

let created = 0;
let repriced = 0;
let moved = 0;
let unchanged = 0;
let skipped = 0;

/** Every Price some variant still points at — never archive one of these. */
const referenced = new Map();
for (const product of products) {
  for (const v of product.variants ?? []) {
    if (v.stripePriceId) referenced.set(v.stripePriceId, (referenced.get(v.stripePriceId) ?? 0) + 1);
  }
}

const ownsProduct = (p, productId, variantKey) =>
  p.metadata?.sanityProductId === productId && p.metadata?.variantKey === variantKey;
const defaultPriceId = (p) =>
  typeof p.default_price === 'string' ? p.default_price : (p.default_price?.id ?? null);

/**
 * Write a variant's Stripe IDs back into Sanity immediately, rather than
 * batching at the end: if a later variant throws, the IDs already minted in
 * Stripe are still recorded. An orphaned Stripe price is harmless; a lost ID
 * means the next run creates a duplicate.
 */
async function writeBack(productId, patch) {
  const set = {};
  if (patch.stripeProductId) {
    set[`variants[_key=="${patch._key}"].stripeProductId`] = patch.stripeProductId;
  }
  if (patch.stripePriceId) {
    set[`variants[_key=="${patch._key}"].stripePriceId`] = patch.stripePriceId;
  }
  if (Object.keys(set).length === 0) return;
  await sanity.patch(productId).set(set).commit({ autoGenerateArrayKeys: false });
}

for (const product of products) {
  const isActive = product.status === 'active';
  console.log(`${product.title}  [${product.status}]  ${product._id}`);

  for (const variant of product.variants ?? []) {
    if (!variant.sku || typeof variant.priceGBP !== 'number') {
      console.log(`  · ${variant._key}: skipped — needs both a SKU and a price`);
      skipped++;
      continue;
    }

    const name = `${product.title} — ${variant.sku}`;
    const metadata = {
      sanityProductId: product._id,
      variantKey: variant._key,
      sku: variant.sku,
    };
    const patch = { _key: variant._key };

    // ── 1. This variant's OWN Stripe Product.
    let existing = null;
    if (variant.stripeProductId) {
      try {
        existing = await stripe.products.retrieve(variant.stripeProductId);
      } catch {
        console.log(`  ! ${variant.sku}: product ${variant.stripeProductId} missing from Stripe`);
      }
    }
    if (existing && !ownsProduct(existing, product._id, variant._key)) {
      console.log(
        `  ! ${variant.sku}: product ${existing.id} belongs to ${existing.metadata?.sku ?? 'another variant'} — giving this variant its own`
      );
      existing = null;
      moved++;
    }

    let stripeProductId = existing?.id;
    if (existing) {
      if (existing.name !== name || existing.active !== isActive) {
        if (!DRY_RUN) await stripe.products.update(existing.id, { name, active: isActive, metadata });
        console.log(`  ~ ${variant.sku}: product name/active updated`);
      }
    } else if (DRY_RUN) {
      console.log(`  + ${variant.sku}: would create Stripe product "${name}"`);
    } else {
      const createdProduct = await stripe.products.create({ name, active: isActive, metadata });
      stripeProductId = createdProduct.id;
      patch.stripeProductId = createdProduct.id;
      console.log(`  + ${variant.sku}: product ${createdProduct.id}`);
    }

    // ── 2. An active Price, on this Product, matching priceGBP.
    let needNewPrice = true;
    let oldPriceIsOurs = false;
    if (variant.stripePriceId) {
      try {
        const price = await stripe.prices.retrieve(variant.stripePriceId);
        const priceProduct = typeof price.product === 'string' ? price.product : price.product.id;
        oldPriceIsOurs = Boolean(existing) && priceProduct === existing.id;
        if (oldPriceIsOurs && price.active && price.currency === 'gbp' && price.unit_amount === variant.priceGBP) {
          needNewPrice = false;
        }
      } catch {
        // Price missing in Stripe — fall through and create a new one.
      }
    }

    if (!needNewPrice) {
      if (defaultPriceId(existing) !== variant.stripePriceId) {
        if (!DRY_RUN) await stripe.products.update(existing.id, { default_price: variant.stripePriceId });
        console.log(`  ~ ${variant.sku}: default price pointed back at ${variant.stripePriceId}`);
      }
      console.log(`  = ${variant.sku}: already ${gbp(variant.priceGBP)}`);
      unchanged++;
      continue;
    }

    // The superseded Price may be archived once nothing references it: ours
    // always; someone else's only when this was its last user.
    const oldPrice = variant.stripePriceId;
    const archivable =
      oldPrice && (oldPriceIsOurs || (referenced.get(oldPrice) ?? 0) <= 1);

    if (DRY_RUN) {
      console.log(
        `  + ${variant.sku}: would create price ${gbp(variant.priceGBP)}${
          oldPrice ? `; ${archivable ? 'archive' : 'keep (still used elsewhere)'} ${oldPrice}` : ''
        }`
      );
      if (oldPrice) repriced++;
      else created++;
      continue;
    }

    const newPrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: variant.priceGBP,
      currency: 'gbp',
    });
    await stripe.products.update(stripeProductId, { default_price: newPrice.id });

    // ── 3. Record the IDs in Sanity before archiving anything, so checkout
    // switches to the new Price before the old one stops working.
    patch.stripePriceId = newPrice.id;
    await writeBack(product._id, patch);

    if (oldPrice) {
      if (archivable) {
        // In-flight checkout sessions keep working with an archived price.
        try {
          await stripe.prices.update(oldPrice, { active: false });
        } catch {
          /* best-effort archive */
        }
      }
      referenced.set(oldPrice, (referenced.get(oldPrice) ?? 1) - 1);
      repriced++;
    } else {
      created++;
    }

    console.log(
      `  + ${variant.sku}: price ${newPrice.id} (${gbp(variant.priceGBP)})${
        oldPrice ? `; ${archivable ? 'archived' : 'kept'} ${oldPrice}` : ''
      }`
    );
  }
}

console.log(
  `\n${DRY_RUN ? 'Would create' : 'Created'} ${created} price(s), reprice ${repriced}, give ${moved} variant(s) their own product, ${unchanged} already in sync, ${skipped} incomplete variant(s).\n`
);
