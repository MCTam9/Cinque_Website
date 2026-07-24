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
let unchanged = 0;
let skipped = 0;

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

    // ── 1. Stripe Product for this SKU.
    let stripeProductId = variant.stripeProductId;
    if (!stripeProductId) {
      if (DRY_RUN) {
        console.log(`  + ${variant.sku}: would create Stripe product "${name}"`);
      } else {
        const createdProduct = await stripe.products.create({ name, active: isActive, metadata });
        stripeProductId = createdProduct.id;
        patch.stripeProductId = createdProduct.id;
        console.log(`  + ${variant.sku}: product ${createdProduct.id}`);
      }
    } else {
      try {
        const existing = await stripe.products.retrieve(stripeProductId);
        if (existing.name !== name || existing.active !== isActive) {
          if (!DRY_RUN) {
            await stripe.products.update(stripeProductId, { name, active: isActive, metadata });
          }
          console.log(`  ~ ${variant.sku}: product name/active updated`);
        }
      } catch {
        // Referenced product is gone from Stripe (deleted by hand) — recreate.
        if (DRY_RUN) {
          console.log(`  + ${variant.sku}: would recreate missing product ${stripeProductId}`);
        } else {
          const recreated = await stripe.products.create({ name, active: isActive, metadata });
          stripeProductId = recreated.id;
          patch.stripeProductId = recreated.id;
          console.log(`  + ${variant.sku}: recreated product ${recreated.id}`);
        }
      }
    }

    // ── 2. Active Price matching priceGBP.
    let needNewPrice = true;
    if (variant.stripePriceId) {
      try {
        const price = await stripe.prices.retrieve(variant.stripePriceId);
        if (price.active && price.currency === 'gbp' && price.unit_amount === variant.priceGBP) {
          needNewPrice = false;
        }
      } catch {
        // Price missing in Stripe — fall through and create a new one.
      }
    }

    if (!needNewPrice) {
      console.log(`  = ${variant.sku}: already ${gbp(variant.priceGBP)}`);
      unchanged++;
      if (!DRY_RUN) await writeBack(product._id, patch);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  + ${variant.sku}: would create price ${gbp(variant.priceGBP)}`);
      if (variant.stripePriceId) repriced++;
      else created++;
      continue;
    }

    const newPrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: variant.priceGBP,
      currency: 'gbp',
    });
    await stripe.products.update(stripeProductId, { default_price: newPrice.id });

    if (variant.stripePriceId) {
      // Archive the superseded price — in-flight checkout sessions keep working.
      try {
        await stripe.prices.update(variant.stripePriceId, { active: false });
      } catch {
        /* best-effort archive */
      }
      repriced++;
    } else {
      created++;
    }

    patch.stripePriceId = newPrice.id;
    console.log(`  + ${variant.sku}: price ${newPrice.id} (${gbp(variant.priceGBP)})`);

    // ── 3. Record the IDs in Sanity before moving on.
    await writeBack(product._id, patch);
  }
}

console.log(
  `\n${DRY_RUN ? 'Would create' : 'Created'} ${created} price(s), reprice ${repriced}, ${unchanged} already in sync, ${skipped} incomplete variant(s).\n`
);
