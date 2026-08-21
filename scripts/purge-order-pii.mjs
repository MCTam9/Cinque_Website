/**
 * One-off migration: strip stored customer PII from existing order documents.
 *
 *   node scripts/purge-order-pii.mjs          # report what would change
 *   node scripts/purge-order-pii.mjs --apply  # unset the fields
 *
 * Removing `customer` from the order schema stops NEW orders carrying buyer
 * details, but it does not touch what is already in the Content Lake — those
 * fields simply become invisible in the Studio while staying fully readable
 * over the query API. On the free plan the dataset is public, so they must be
 * unset explicitly. That is what this does.
 *
 * Idempotent: unsetting an absent field is a no-op, so re-running is harmless.
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

// Fields that must not exist on a publicly-readable order document.
const PII_FIELDS = ['customer'];

const apply = process.argv.includes('--apply');

// Report on presence only — never print the values themselves, or the PII just
// moves from the dataset into a terminal history and CI log.
const orders = await client.fetch(
  `*[_type == "order" && defined(customer)]{ _id, orderNumber,
     "has": { "email": defined(customer.email), "name": defined(customer.name),
              "phone": defined(customer.phone),
              "address": defined(customer.shippingAddress) } }`
);

if (orders.length === 0) {
  console.log('No order documents carry customer PII. Nothing to do.');
  process.exit(0);
}

console.log(`${orders.length} order document(s) still carry customer PII:`);
for (const o of orders) {
  const present = Object.entries(o.has)
    .filter(([, v]) => v)
    .map(([k]) => k);
  console.log(`  ${o.orderNumber ?? o._id}  →  ${present.join(', ') || '(empty object)'}`);
}

if (!apply) {
  console.log('\nDry run. Re-run with --apply to unset these fields.');
  process.exit(0);
}

const tx = client.transaction();
for (const o of orders) tx.patch(o._id, (p) => p.unset(PII_FIELDS));
await tx.commit();

const left = await client.fetch(`count(*[_type == "order" && defined(customer)])`);
console.log(`\nPurged. Orders still carrying customer data: ${left}`);
if (left !== 0) {
  console.error('Expected 0 — investigate before treating this as done.');
  process.exit(1);
}
