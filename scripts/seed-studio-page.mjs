/**
 * One-off seed: fills the Studio Page singleton with the copy and imagery
 * /studio already shipped with, so the owner edits real text in the Studio
 * instead of facing empty fields (the page falls back to the same content, so
 * this changes nothing visually — it just makes it editable).
 *
 *   node scripts/seed-studio-page.mjs          # only if the doc is empty
 *   node scripts/seed-studio-page.mjs --force  # overwrite whatever is there
 *
 * Safe to re-run: without --force it uses createIfNotExists, so owner edits are
 * never clobbered. Image assets are reused by originalFilename, not re-uploaded.
 * Reads Sanity credentials from .env.local.
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
const force = process.argv.includes('--force');

// ── The two photos the page currently hardcodes ──────────────
const PHOTOS = {
  portrait: { file: 'lookbook-2-bench-flatlay.png', alt: 'Cinque studio' },
  band: { file: 'home-studio.png', alt: 'Cinque studio flatlay' },
};

async function ensureAsset(file) {
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

/** Plain paragraphs as Portable Text blocks. */
const blocks = (paragraphs) =>
  paragraphs.map((text, i) => ({
    _type: 'block',
    _key: `p${i + 1}`,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: 's1', marks: [], text }],
  }));

const ABOUT = [
  'Cinque founder Cindy Liu, with backgrounds in architecture and metalsmithing, practises jewellery and object making as a form of memory archive.',
  'Through wax and metal forming, Cinque transforms natural and cultural relics into tangible, wearable pieces—sealing ephemeral moments into the material permanence of metalwork. Each piece evokes new interpretations of memory, activated through the touch of skin. Cinque® uses this instinctive, tactile connection to express delicate, transient memories through the warmth of the five fingers—hence the name Cinque, meaning “five.”',
  'Handmade and cast in London, Cinque’s pieces create new connections and tangible interpretations of memories, accessed from the touch of skin.',
  'Cinque works closely with photographer and multi-disciplinary designer Vincent Tam to explore the dialogue between object, image and documentation.',
];

async function main() {
  const portraitAsset = await ensureAsset(PHOTOS.portrait.file);
  const bandAsset = await ensureAsset(PHOTOS.band.file);

  const doc = {
    _id: 'studioPage',
    _type: 'studioPage',
    label: '[Cinque: five]',
    about: blocks(ABOUT),
    instagramUrl: 'https://www.instagram.com/cinque.made',
    portrait: {
      _type: 'image',
      alt: PHOTOS.portrait.alt,
      asset: { _type: 'reference', _ref: portraitAsset },
    },
    bandImage: {
      _type: 'image',
      alt: PHOTOS.band.alt,
      asset: { _type: 'reference', _ref: bandAsset },
    },
    contactIntro:
      'For bespoke commissions, custom variations, or general enquiries, please email:',
    email: 'cindy@cinque.studio',
    commissionNote: 'For bespoke commissions,\nkindly include:',
    commissionChecklist: [
      'Desired timeline',
      'Budget range (if known)',
      'Any existing stone or piece to incorporate',
    ],
    responseTime: 'We aim to respond within 2–3 working days.',
    address: 'Cinque® Studio\nLondon, W2',
    seoDescription:
      'Cinque® founder Cindy Liu — jewellery and object making as a form of memory archive. Handmade and cast in London.',
  };

  if (force) {
    await client.createOrReplace(doc);
    console.log('✓ Studio Page replaced with the built-in copy (--force).');
  } else {
    const before = await client.fetch('*[_id == "studioPage"][0]._updatedAt');
    await client.createIfNotExists(doc);
    console.log(
      before
        ? '• Studio Page already exists — left untouched. Re-run with --force to overwrite.'
        : '✓ Studio Page seeded with the copy and images the page shipped with.'
    );
  }

  console.log('\nEdit it in /admin → Studio Page.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
