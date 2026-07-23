/**
 * One-off seed: creates a test product (active, with a collection, category,
 * image, and two priced variants) so the Shop grid / PDP / cart flow can be
 * exercised end-to-end. Idempotent via deterministic _ids.
 *
 *   node scripts/seed-test-product.mjs
 *
 * Reads Sanity credentials from .env.local. Safe to delete after use; re-run to
 * refresh. Remove the seeded docs in the Studio (/admin) or with a delete call.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createClient } from '@sanity/client';

// ── Load .env.local ──────────────────────────────────────────
const envText = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!projectId || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env.local');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion: '2024-10-01', token, useCdn: false });

// ── Minimal solid-colour PNG (no image deps) ─────────────────
function crc32(buf) {
  const table = (crc32.t ||= (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function makePNG(w, h, [r, g, b]) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, RGB
  const rowLen = 1 + w * 3;
  const row = Buffer.alloc(rowLen);
  for (let i = 0; i < w; i++) { row[1 + i * 3] = r; row[2 + i * 3] = g; row[3 + i * 3] = b; }
  const raw = Buffer.concat(Array(h).fill(row));
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const COLLECTION_ID = 'seed.collection.metal-veil';
const PRODUCT_ID = 'seed.product.lace-fork-pendant';

async function main() {
  // Reuse an existing image asset if we've seeded before.
  const existing = await client.getDocument(PRODUCT_ID).catch(() => null);
  let assetId = existing?.images?.[0]?.asset?._ref;
  if (!assetId) {
    const png = makePNG(600, 800, [0xc9, 0xc8, 0xc4]); // 'cloud' placeholder
    const asset = await client.assets.upload('image', png, {
      filename: 'lace-fork-pendant.png',
      contentType: 'image/png',
    });
    assetId = asset._id;
    console.log('Uploaded image asset:', assetId);
  } else {
    console.log('Reusing existing image asset:', assetId);
  }

  await client.createOrReplace({
    _id: COLLECTION_ID,
    _type: 'collection',
    title: 'Metal Veil',
    slug: { _type: 'slug', current: 'metal-veil' },
    dropNumber: 1,
  });

  await client.createOrReplace({
    _id: PRODUCT_ID,
    _type: 'product',
    title: '01_Lace_Fork_Pendant',
    slug: { _type: 'slug', current: 'lace-fork-pendant' },
    status: 'active',
    category: 'necklaces',
    edition: 'Edition of 5',
    collection: { _type: 'reference', _ref: COLLECTION_ID },
    images: [
      { _type: 'image', _key: 'img1', alt: 'Lace Fork Pendant', asset: { _type: 'reference', _ref: assetId } },
    ],
    description: [
      {
        _type: 'block', _key: 'b1', style: 'normal', markDefs: [],
        children: [{
          _type: 'span', _key: 's1', marks: [],
          text: 'A one-of-a-kind cast pendant from the studio archive. Individually made, cast and hallmarked in London.',
        }],
      },
    ],
    careInstructions:
      'To clean, wash your pieces with warm water and gentle soap. Sterling silver naturally tarnishes over time.',
    variants: [
      { _type: 'variant', _key: 'v1', sku: 'LFP-SS-M', metalType: 'sterling_silver', size: 'M', priceGBP: 20000, stockQuantity: 5, allowBackorder: false },
      { _type: 'variant', _key: 'v2', sku: 'LFP-SS-P', metalType: 'sterling_silver', size: 'P', priceGBP: 22000, stockQuantity: 2, allowBackorder: false },
    ],
  });

  console.log('✓ Seeded product "Lace Fork Pendant" (active) at /shop/lace-fork-pendant');
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
