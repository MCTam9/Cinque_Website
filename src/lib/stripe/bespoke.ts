import 'server-only';
import { stripe } from '@/lib/stripe';
import { serverEnv } from '@/lib/serverEnv';
import { sanityWriteClient } from '@/lib/sanity/writeClient';
import { urlFor } from '@/lib/sanity/image';
import {
  INTERNATIONAL_DUTIES_NOTE,
  SHIPPING_RATES,
  SHIP_COUNTRY_CODES,
  importChargesNotice,
  isShipCountry,
  shippingQuote,
  type ShipCountry,
} from '@/lib/shop/shipping';
import { ANY_COUNTRY } from '@/lib/shop/bespoke';

/**
 * ─────────────────────────────────────────────────────────────
 * BESPOKE PAYMENT LINKS
 * ─────────────────────────────────────────────────────────────
 * A "Bespoke payment link" published in the Admin becomes a Stripe Payment
 * Link: the piece at its price, shipping to any country we ship to (or one,
 * if the owner picks it) at the usual rates, shipping address and phone
 * collected, one payment only. The link's URL is
 * written back for the owner to copy. When it's paid, the Stripe webhook
 * records the order (lines from what Stripe charged) and marks the Admin
 * entry paid. Cancelling switches the link off.
 *
 * Loop-safe: the write-back retriggers the Sanity hook, which then finds the
 * link already made and does nothing.
 */

interface BespokeDoc {
  _id: string;
  title?: string;
  /** "UK N": a ring's size, from the Admin's dropdown. */
  size?: string;
  engraving?: string;
  description?: string;
  /** Internal workshop notes: never sent to Stripe. */
  notes?: string;
  image?: { asset?: unknown };
  priceGBP?: number;
  shipTo?: string;
  invoicePdf?: boolean;
  cancelled?: boolean;
  status?: 'ready' | 'paid' | 'cancelled';
  linkFor?: string;
  stripePaymentLinkId?: string;
}

/**
 * The Stripe Product description the customer reads on the payment page and
 * receipt: "Size UK N · Engraving “…” · <details>", leaving out what's empty.
 * Size and engraving are short and Details is capped at 500 in the Admin, so
 * this stays well inside Stripe's limits. Notes never go to Stripe.
 */
function productDescription(doc: BespokeDoc): string {
  return [
    doc.size?.trim() && `Size ${doc.size.trim()}`,
    doc.engraving?.trim() && `Engraving “${doc.engraving.trim()}”`,
    doc.description?.trim(),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Who the confirmation message is from: the sender name on our emails. */
const sender = () => /^\s*"?([^"<]+?)"?\s*</.exec(serverEnv.EMAIL_FROM ?? '')?.[1] ?? 'Cinque';

/** Make, or cancel, the Stripe link for a published bespoke entry. */
export async function syncBespokeOrder(id: string): Promise<string> {
  if (id.startsWith('drafts.') || id.startsWith('versions.')) return 'draft';
  const doc = await sanityWriteClient.getDocument<BespokeDoc>(id);
  if (!doc) return 'missing';
  if (doc.status === 'paid') return 'paid';

  // A copy made with Duplicate carries the original's link: not its own.
  const ownLink =
    doc.linkFor === doc._id && doc.stripePaymentLinkId ? doc.stripePaymentLinkId : null;

  if (ownLink) {
    if (doc.cancelled && doc.status !== 'cancelled') {
      await stripe.paymentLinks.update(ownLink, { active: false });
      await sanityWriteClient.patch(id).set({ status: 'cancelled' }).commit();
      return 'cancelled';
    }
    return 'unchanged';
  }
  if (doc.cancelled) return 'cancelled before a link was made';

  const price = doc.priceGBP;
  const country = doc.shipTo ?? ANY_COUNTRY;
  const anyCountry = country === ANY_COUNTRY;
  if (
    !doc.title ||
    !Number.isInteger(price) ||
    (price as number) < 100 ||
    !(anyCountry || isShipCountry(country))
  ) {
    return 'incomplete';
  }

  const description = productDescription(doc);
  // Size and engraving ride along in metadata too (values ≤ 500 characters).
  const metadata = {
    bespokeOrderId: id,
    ...(doc.size?.trim() ? { size: doc.size.trim().slice(0, 500) } : {}),
    ...(doc.engraving?.trim() ? { engraving: doc.engraving.trim().slice(0, 500) } : {}),
  };
  const product = await stripe.products.create({
    name: doc.title,
    ...(description ? { description } : {}),
    ...(doc.image?.asset
      ? {
          images: [
            urlFor(doc.image as never)
              .width(800)
              .url(),
          ],
        }
      : {}),
    metadata,
  });
  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: price as number,
    currency: 'gbp',
  });

  // A payment link can't price shipping from the address typed, so with any
  // country allowed: one free option from £300, otherwise UK or international
  // for the customer to choose (each labelled with where it's for).
  const rates: { label: string; amount: number }[] = !anyCountry
    ? [shippingQuote(country, price as number)].map((q) => ({
        label: q.label,
        amount: q.amountPence,
      }))
    : (price as number) >= SHIPPING_RATES.freeFromPence
      ? [{ label: 'Free tracked delivery', amount: 0 }]
      : [
          { label: 'UK tracked delivery (UK addresses)', amount: SHIPPING_RATES.domesticPence },
          {
            label: 'International tracked delivery (US, Canada, Australia, Japan)',
            amount: SHIPPING_RATES.internationalPence,
          },
        ];
  const shippingRates = await Promise.all(
    rates.map((r) =>
      stripe.shippingRates.create({
        display_name: r.label,
        type: 'fixed_amount',
        fixed_amount: { amount: r.amount, currency: 'gbp' },
      }),
    ),
  );
  const duties = anyCountry
    ? INTERNATIONAL_DUTIES_NOTE
    : importChargesNotice(country as ShipCountry);

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: stripePrice.id, quantity: 1 }],
    shipping_address_collection: {
      allowed_countries: anyCountry ? SHIP_COUNTRY_CODES : [country as ShipCountry],
    },
    shipping_options: shippingRates.map((r) => ({ shipping_rate: r.id })),
    phone_number_collection: { enabled: true },
    // One payment, then the link switches itself off.
    restrictions: { completed_sessions: { limit: 1 } },
    ...(duties ? { custom_text: { shipping_address: { message: duties.slice(0, 1200) } } } : {}),
    ...(doc.invoicePdf ? { invoice_creation: { enabled: true } } : {}),
    after_completion: {
      type: 'hosted_confirmation',
      hosted_confirmation: {
        custom_message: `Thank you! Your order confirmation is on its way by email, and I’ll be in touch about the next steps. ${sender()}`,
      },
    },
    metadata,
  });

  await sanityWriteClient
    .patch(id)
    .set({
      linkFor: id,
      stripePaymentLinkId: link.id,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
      paymentLinkUrl: link.url,
      status: 'ready',
    })
    .commit();
  return 'link created';
}

/** What the webhook copies from a paid link's Admin entry onto the order line. */
export interface PaidBespoke {
  _id: string;
  size?: string | null;
  engraving?: string | null;
  notes?: string | null;
}

/**
 * The Admin entry that made this payment link (not a Duplicate carrying its
 * id), or null. Its dotted id needs the token, so this uses the write client.
 */
export async function findBespokeForLink(paymentLinkId: string): Promise<PaidBespoke | null> {
  return sanityWriteClient.fetch(
    `*[_type == "bespokeOrder" && stripePaymentLinkId == $link && linkFor == _id][0]{
      _id, size, engraving, notes
    }`,
    { link: paymentLinkId },
  );
}

/** A bespoke link was paid: mark its Admin entry paid, with the order number. */
export async function markBespokePaid(id: string, orderNumber: string): Promise<void> {
  await sanityWriteClient
    .patch(id)
    .set({ status: 'paid', orderNumber, paidAt: new Date().toISOString() })
    .commit();
}
