/**
 * One-off seed: creates the five Lookbook drops (00–04) as editable documents,
 * using the existing Figma lookbook photos as their images and the studio
 * archive copy as their intro. Idempotent:
 *   - drops use deterministic _ids (createOrReplace)
 *   - image assets are reused by originalFilename instead of re-uploaded
 *
 *   node scripts/seed-lookbook-drops.mjs
 *
 * Reads Sanity credentials from .env.local. After seeding, edit everything in
 * the Studio (/admin → Editorial → Lookbook Drops).
 */
import fs from 'node:fs';
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

// ── Upload (or reuse) the three lookbook photos ──────────────
const PHOTOS = [
  { key: 'hand', file: 'lookbook-1-hand.png', alt: 'Cinque piece worn on the hand' },
  { key: 'bench', file: 'lookbook-2-bench-flatlay.png', alt: 'Cinque studio bench' },
  { key: 'macro', file: 'lookbook-3-macro-hallmark-bead.png', alt: 'Cinque piece — macro detail' },
];

async function ensureAsset({ file, alt }) {
  const existing = await client.fetch(
    '*[_type == "sanity.imageAsset" && originalFilename == $fn][0]._id',
    { fn: file }
  );
  if (existing) {
    console.log(`Reusing asset for ${file}: ${existing}`);
    return existing;
  }
  const buf = fs.readFileSync(new URL(`../public/figma/${file}`, import.meta.url));
  const asset = await client.assets.upload('image', buf, { filename: file, contentType: 'image/png' });
  console.log(`Uploaded asset for ${file}: ${asset._id}`);
  return asset._id;
}

// ── Intro copy (Portable Text) shared by every drop ──────────
function intro() {
  return [
    {
      _type: 'block', _key: 'p1', style: 'normal', markDefs: [],
      children: [{
        _type: 'span', _key: 's1', marks: [],
        text: 'Pieces held within the cloud of Cinque’s studio archive—one-of-a-kind and limited objects not assigned to any formal collection.',
      }],
    },
    {
      _type: 'block', _key: 'p2', style: 'normal', markDefs: [],
      children: [{
        _type: 'span', _key: 's1', marks: [],
        text: 'All Cinque® pieces are individually made, cast and hallmarked (for silver and carat-gold items only) in London. Due to the handmade nature, each piece is unique and no exact replicas are produced.',
      }],
    },
    {
      _type: 'block', _key: 'p3', style: 'normal',
      markDefs: [{ _key: 'contact', _type: 'link', href: '/studio#contact' }],
      children: [
        { _type: 'span', _key: 's1', marks: ['contact'], text: 'Contact us' },
        { _type: 'span', _key: 's2', marks: [], text: ' to request a custom variation of an existing design. Further details regarding timeline and quotation will follow.' },
      ],
    },
  ];
}

// ── The five drops ───────────────────────────────────────────
const DROPS = [
  { num: '00', title: 'Archive', slug: 'archive' },
  { num: '01', title: 'Metal Veil', slug: 'metal-veil' },
  { num: '02', title: 'Shell Relic', slug: 'shell-relic' },
  { num: '03', title: 'Hastata', slug: 'hastata' },
  { num: '04', title: 'Lost Garden', slug: 'lost-garden' },
];

// Image layout per drop: featured, then the grid — reuses the three photos to
// match the current page density (owner can swap/remove any of them later).
const LAYOUT = ['hand', 'macro', 'bench', 'hand', 'bench', 'macro', 'hand'];

async function main() {
  const assetIds = {};
  for (const p of PHOTOS) assetIds[p.key] = await ensureAsset(p);
  const altOf = Object.fromEntries(PHOTOS.map((p) => [p.key, p.alt]));

  for (const d of DROPS) {
    const images = LAYOUT.map((key, i) => ({
      _type: 'image',
      _key: `img${i + 1}`,
      alt: altOf[key],
      asset: { _type: 'reference', _ref: assetIds[key] },
    }));

    await client.createOrReplace({
      _id: `seed.lookbookDrop.${d.num}-${d.slug}`,
      _type: 'lookbookDrop',
      title: d.title,
      dropNumber: d.num,
      slug: { _type: 'slug', current: d.slug },
      intro: intro(),
      images,
    });
    console.log(`✓ Seeded drop ${d.num}/${d.title} (/lookbook?drop=${d.slug})`);
  }

  console.log('\nDone. Edit them in /admin → Editorial → Lookbook Drops.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
