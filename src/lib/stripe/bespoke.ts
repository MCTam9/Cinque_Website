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
  description?: string;
  image?: { asset?: unknown };
  priceGBP?: number;
  shipTo?: string;
  invoicePdf?: boolean;
  cancelled?: boolean;
  status?: 'ready' | 'paid' | 'cancelled';
  linkFor?: string;
  stripePaymentLinkId?: string;
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

  const product = await stripe.products.create({
    name: doc.title,
    ...(doc.description ? { description: doc.description } : {}),
    ...(doc.image?.asset
      ? {
          images: [
            urlFor(doc.image as never)
              .width(800)
              .url(),
          ],
        }
      : {}),
    metadata: { bespokeOrderId: id },
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
    metadata: { bespokeOrderId: id },
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

/** A bespoke link was paid: mark its Admin entry paid, with the order number. */
export async function markBespokePaid(paymentLinkId: string, orderNumber: string): Promise<void> {
  const id: string | null = await sanityWriteClient.fetch(
    `*[_type == "bespokeOrder" && stripePaymentLinkId == $link && linkFor == _id][0]._id`,
    { link: paymentLinkId },
  );
  if (!id) return;
  await sanityWriteClient
    .patch(id)
    .set({ status: 'paid', orderNumber, paidAt: new Date().toISOString() })
    .commit();
}
