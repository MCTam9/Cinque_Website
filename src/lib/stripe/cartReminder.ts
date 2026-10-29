import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { serverEnv } from '@/lib/serverEnv';
import { publicEnv } from '@/lib/env';
import { sanityWriteClient } from '@/lib/sanity/writeClient';
import { urlFor } from '@/lib/sanity/image';
import { formatLabel } from '@/lib/products';
import { sendCartReminder } from '@/lib/fulfillment/email';
import { ENGRAVING_PRICE_PENCE, lineTotalGBP } from '@/lib/shop/madeToOrder';
import { largeSizesOf, ringSizeCharge } from '@/lib/shop/ringSizes';
import type { CartLine, FulfillmentLine } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────
 * ABANDONED CHECKOUT REMINDERS
 * ─────────────────────────────────────────────────────────────
 * The checkout page takes the buyer's email before Stripe's form, with an
 * opt-out tickbox under it. When that checkout expires unpaid, the buyer gets
 * ONE plain reminder (no discount, no other products) with a link that puts
 * the same items back in their cart, and every reminder carries an
 * unsubscribe link. That is the PECR "soft opt-in": details collected while
 * negotiating a sale, a way to opt out where they were collected, and in
 * every message.
 *
 * At most one reminder per address every REMINDER_GAP_DAYS, never after an
 * opt-out, and never when they paid in another checkout meanwhile.
 *
 * Sanity holds no email addresses (the dataset is public): records are keyed
 * by a SHA-256 of the address, in dotted ids so they are token-only anyway.
 * The address itself stays in Stripe, on the checkout session.
 */

export const REMINDER_GAP_DAYS = 30;
const DAY_MS = 86_400_000;

/** A stable, non-reversible key for an address. */
export const emailKey = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

// Links are signed so nobody can restore another person's checkout or
// unsubscribe someone else. The key is derived from an existing secret.
const signingKey = () =>
  createHmac('sha256', serverEnv.STRIPE_WEBHOOK_SECRET).update('cart-reminder').digest();
const sign = (value: string) =>
  createHmac('sha256', signingKey()).update(value).digest('base64url');
const verify = (value: string, sig: string | null) => {
  if (!sig) return false;
  const a = Buffer.from(sign(value));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
};

const site = publicEnv.NEXT_PUBLIC_SITE_URL;
export const restoreUrl = (sessionId: string) =>
  `${site}/cart/restore?s=${encodeURIComponent(sessionId)}&t=${sign(`restore:${sessionId}`)}`;
export const verifyRestore = (sessionId: string, sig: string | null) =>
  verify(`restore:${sessionId}`, sig);
export const unsubscribeUrl = (key: string) =>
  `${site}/unsubscribe?e=${key}&t=${sign(`unsub:${key}`)}`;
/** The same, for the List-Unsubscribe one-click POST mail clients send. */
export const unsubscribeApiUrl = (key: string) =>
  `${site}/api/cart/unsubscribe?e=${key}&t=${sign(`unsub:${key}`)}`;
export const verifyUnsubscribe = (key: string, sig: string | null) =>
  /^[0-9a-f]{64}$/.test(key) && verify(`unsub:${key}`, sig);

/** Record that this address wants no reminders. */
export async function optOut(key: string): Promise<void> {
  await sanityWriteClient.createIfNotExists({
    _id: `reminderOptOut.${key}`,
    _type: 'reminderOptOut',
    createdAt: new Date().toISOString(),
  });
}

/**
 * Rebuild cart lines from a checkout session's metadata at today's prices,
 * the way the PDP would add them. Anything no longer on sale is left out.
 */
export async function cartFromSession(session: Stripe.Checkout.Session): Promise<CartLine[]> {
  let fls: FulfillmentLine[] = [];
  try {
    fls = JSON.parse(session.metadata?.cart ?? '[]');
  } catch {
    return [];
  }
  const lines: CartLine[] = [];
  for (const [i, fl] of fls.entries()) {
    const doc = await sanityWriteClient.fetch(
      `*[_type == "product" && _id == $pid][0]{
        _id, title, status, category, offerEngraving,
        "image": images[0],
        "variant": variants[_key == $vkey][0]{
          _key, sku, priceGBP, madeToOrder, metalType, largeSizesUpTo, largeSizeSurchargeGBP
        }
      }`,
      { pid: fl.p, vkey: fl.v },
    );
    if (!doc?.variant || doc.status !== 'active') continue;
    const mto = Boolean(doc.variant.madeToOrder);
    const ring = mto && doc.category === 'rings';
    const size = mto ? fl.s : undefined;
    const largeSizeGBP =
      ring && size ? ringSizeCharge(size, largeSizesOf(doc.category, doc.variant)).surchargeGBP : 0;
    const engraving = ring && doc.offerEngraving ? fl.e : undefined;
    const notes = ring ? session.metadata?.[`n${i}`] : undefined;
    lines.push({
      productId: doc._id,
      variantKey: doc.variant._key,
      sku: doc.variant.sku,
      title: formatLabel(doc.title),
      unitPriceGBP: doc.variant.priceGBP,
      quantity: fl.q,
      imageUrl: doc.image?.asset ? urlFor(doc.image).width(200).url() : undefined,
      ...(mto ? { madeToOrder: true, customSize: size ?? '' } : {}),
      ...(largeSizeGBP ? { largeSizeGBP } : {}),
      ...(engraving ? { engraving, engravingGBP: ENGRAVING_PRICE_PENCE } : {}),
      ...(notes ? { notes } : {}),
    });
  }
  return lines;
}

/** The address a checkout was started with: ours, or what Stripe collected. */
const emailOf = (s: Stripe.Checkout.Session) =>
  s.customer_email ?? s.customer_details?.email ?? null;

/**
 * A checkout expired unpaid: list it in the Admin (Unpaid checkouts) and, if
 * allowed, send the one reminder.
 */
export async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const email = emailOf(session);
  if (!email) return; // started before the email step, or a test session
  const key = emailKey(email);

  // Paid in another checkout in the meantime (e.g. after changing country)?
  // Then nothing was abandoned.
  const paid = await stripe.checkout.sessions.list({
    customer_details: { email },
    status: 'complete',
    created: { gte: session.created - DAY_MS / 1000 },
    limit: 1,
  });
  if (paid.data.length) return;

  const items = await cartFromSession(session);
  if (!items.length) return;

  const declined = session.metadata?.remind !== '1';
  if (session.metadata?.remind === '0') await optOut(key);
  const optedOut =
    declined || Boolean(await sanityWriteClient.getDocument(`reminderOptOut.${key}`));

  const logId = `cartReminder.${key}`;
  const last = await sanityWriteClient.getDocument<{ sentAt?: string }>(logId);
  const recentlyReminded =
    last?.sentAt && Date.now() - Date.parse(last.sentAt) < REMINDER_GAP_DAYS * DAY_MS;

  let reminderSentAt: string | undefined;
  if (!optedOut && !recentlyReminded) {
    const sent = await sendCartReminder({
      to: email,
      lines: items,
      restoreUrl: restoreUrl(session.id),
      unsubscribeUrl: unsubscribeUrl(key),
      unsubscribeApiUrl: unsubscribeApiUrl(key),
    });
    if (sent.ok) {
      reminderSentAt = new Date().toISOString();
      await sanityWriteClient.createOrReplace({
        _id: logId,
        _type: 'cartReminder',
        sentAt: reminderSentAt,
      });
    }
  }

  // One Admin entry per address per day, so the extra checkouts a buyer opens
  // by changing country collapse into one.
  const day = new Date(session.created * 1000).toISOString().slice(0, 10).replaceAll('-', '');
  const docId = `abandonedCheckout.${key.slice(0, 16)}-${day}`;
  await sanityWriteClient
    .transaction()
    .createIfNotExists({ _id: docId, _type: 'abandonedCheckout', emailKey: key })
    .patch(docId, (p) =>
      p.set({
        lastCheckoutAt: new Date(session.created * 1000).toISOString(),
        stripeSessionId: session.id,
        country: session.shipping_address_collection?.allowed_countries?.[0] ?? null,
        valueGBP: items.reduce((sum, l) => sum + lineTotalGBP(l), 0),
        items: items.map((l, i) => ({
          _key: `i${i}`,
          title: l.title,
          sku: l.sku,
          quantity: l.quantity,
          size: l.customSize || undefined,
          amountGBP: lineTotalGBP(l),
        })),
        optedOut,
        ...(reminderSentAt ? { reminderSentAt } : {}),
      }),
    )
    .commit({ autoGenerateArrayKeys: false });
}

/**
 * An order was paid: mark this buyer's recent unpaid checkouts as recovered,
 * noting whether they came back through the reminder link.
 */
export async function markRecovered(session: Stripe.Checkout.Session, orderNumber: string) {
  const email = emailOf(session);
  if (!email) return;
  const ids: string[] = await sanityWriteClient.fetch(
    `*[_type == "abandonedCheckout" && emailKey == $key && !defined(recoveredAt) && lastCheckoutAt > $since]._id`,
    {
      key: emailKey(email),
      since: new Date(Date.now() - REMINDER_GAP_DAYS * DAY_MS).toISOString(),
    },
  );
  if (!ids.length) return;
  const tx = sanityWriteClient.transaction();
  for (const id of ids) {
    tx.patch(id, (p) =>
      p.set({
        recoveredAt: new Date().toISOString(),
        orderNumber,
        viaReminder: Boolean(session.metadata?.rf),
      }),
    );
  }
  await tx.commit();
}
