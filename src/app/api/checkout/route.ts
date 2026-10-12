import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { chargeableStripeIds } from '@/lib/stripe/sync';
import { sanityClient } from '@/lib/sanity/client';
import { variantForCheckoutQuery } from '@/lib/sanity/queries';
import { publicEnv } from '@/lib/env';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { SHIP_COUNTRY_CODES, importChargesNotice, shippingQuote } from '@/lib/shop/shipping';
import {
  CUSTOM_SIZE_MAX,
  ENGRAVING_MAX,
  ENGRAVING_PATTERN,
  ENGRAVING_PRICE_PENCE,
  MADE_TO_ORDER_LEAD_TIME,
  NOTES_MAX,
} from '@/lib/shop/madeToOrder';
import { CHECKOUT_EXPIRES_MINUTES } from '@/lib/shop/checkoutEmail';
import { largeSizesOf, ringSizeCharge } from '@/lib/shop/ringSizes';
import type { FulfillmentLine } from '@/types';

// Stripe signature/crypto & SDK require the Node.js runtime (not Edge).
export const runtime = 'nodejs';
// Never cache a checkout creation.
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantKey: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
        // Made-to-order lines only: the size the customer typed on the PDP.
        customSize: z.string().trim().min(1).max(CUSTOM_SIZE_MAX).optional(),
        // Made-to-order rings only: a paid engraving and agreed changes.
        engraving: z.string().trim().max(ENGRAVING_MAX).regex(ENGRAVING_PATTERN).optional(),
        notes: z.string().trim().max(NOTES_MAX).optional(),
      })
    )
    .min(1)
    .max(50),
  // Where the order ships. The session only accepts an address in this
  // country, which is what makes the UK / international rate enforceable.
  country: z.enum(SHIP_COUNTRY_CODES),
  // Taken on our page before Stripe's form, so an unpaid checkout can get one
  // reminder (src/lib/stripe/cartReminder.ts). `remind: false` is the opt-out
  // tickbox. Optional only so a page loaded before this change still works.
  email: z.string().trim().email().max(254).optional(),
  remind: z.boolean().optional(),
  // The expired checkout a reminder link restored, to count recoveries.
  recoveredFrom: z
    .string()
    .regex(/^cs_(live|test)_[A-Za-z0-9]+$/)
    .optional(),
});

type VariantResult = {
  _id: string;
  title: string;
  status: string;
  category?: string;
  offerEngraving?: boolean;
  largeSizesUpTo?: string | null;
  largeSizeSurchargeGBP?: number | null;
  variants?: { metalType?: string | null }[] | null;
  variant: {
    _key: string;
    sku: string;
    priceGBP: number;
    stripeProductId?: string;
    stripePriceId?: string;
    stockQuantity: number;
    allowBackorder?: boolean;
    madeToOrder?: boolean;
  } | null;
};

// A single request fans out to one Sanity query PER LINE (up to 50) plus a
// Stripe session create, so an unlimited endpoint is a ~50x amplifier against
// both quotas. Cap it well above real shopping behaviour: a person checking
// out repeatedly is retrying a failure, not placing 10 orders a minute.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

export async function POST(req: Request) {
  if (rateLimit(`checkout:${clientIp(req)}`, { windowMs: RATE_WINDOW_MS, max: RATE_MAX })) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const lineItems: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const fulfillmentLines: FulfillmentLine[] = [];
  // Goods total from the trusted Sanity prices, for the free-shipping threshold.
  let subtotalPence = 0;
  // "Twist Band (size N½)" for each made-to-order line, shown in Stripe's form.
  const madeToOrderItems: string[] = [];
  // Notes ride in their own metadata keys (`n<line index>`), not in `cart`,
  // so a long note can never push the fulfillment map over Stripe's limit.
  const notesMeta: Record<string, string> = {};

  // Validate every line against Sanity — price & stock come from the server,
  // NEVER from the client. This is the price-integrity boundary.
  for (const line of parsed.data.lines) {
    const result = (await sanityClient.fetch(variantForCheckoutQuery, {
      productId: line.productId,
      variantKey: line.variantKey,
    })) as VariantResult | null;

    const variant = result?.variant;
    if (!result || !variant || result.status !== 'active') {
      return NextResponse.json(
        { error: `Item unavailable: ${line.productId}` },
        { status: 409 }
      );
    }

    // Made to order: a size is required, and stock is never the limit. Any size
    // sent for an ordinary variant is ignored rather than trusted.
    const customSize = variant.madeToOrder ? line.customSize : undefined;
    // Notes exist only on made-to-order rings, engraving only where the Admin
    // offers it; anything sent for another variant is dropped, never trusted
    // (and never charged).
    const ringExtras = variant.madeToOrder && result.category === 'rings';
    const engraving =
      ringExtras && result.offerEngraving ? line.engraving || undefined : undefined;
    const notes = ringExtras ? line.notes || undefined : undefined;
    if (variant.madeToOrder && !customSize) {
      return NextResponse.json(
        { error: `Please enter your size for ${result.title}.` },
        { status: 400 }
      );
    }
    // A ring's size must be one the product offers; UK U and up carry its
    // larger-size surcharge, worked out here and never taken from the client.
    let largeSizeGBP = 0;
    if (ringExtras && customSize) {
      const charge = ringSizeCharge(customSize, largeSizesOf(result));
      if (!charge.ok) {
        return NextResponse.json(
          { error: `Please choose your size for ${result.title} again.` },
          { status: 400 }
        );
      }
      largeSizeGBP = charge.surchargeGBP;
    }

    if (
      !variant.madeToOrder &&
      !variant.allowBackorder &&
      variant.stockQuantity < line.quantity
    ) {
      return NextResponse.json(
        { error: `Insufficient stock for ${variant.sku}.` },
        { status: 409 }
      );
    }

    // Charge the synced Stripe Price only when it matches the Sanity amount and
    // belongs to this variant; otherwise build the price from the Sanity amount
    // (attached to the variant's own Stripe Product when it has one). A sync
    // still running after a price change or a Studio duplicate can't make a
    // buyer pay a stale or borrowed price.
    const synced = await chargeableStripeIds(result._id, variant);
    if (synced.priceId) {
      lineItems.push({ price: synced.priceId, quantity: line.quantity });
    } else {
      const priceData: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem.PriceData =
        synced.productId
          ? {
              currency: 'gbp',
              unit_amount: variant.priceGBP, // already in pence
              product: synced.productId,
            }
          : {
              currency: 'gbp',
              unit_amount: variant.priceGBP,
              product_data: { name: `${result.title} — ${variant.sku}` },
            };
      lineItems.push({ quantity: line.quantity, price_data: priceData });
    }

    // A larger size is its own Stripe line at the Admin's surcharge, per piece.
    if (largeSizeGBP) {
      lineItems.push({
        quantity: line.quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: largeSizeGBP,
          product_data: { name: `Larger size — ${result.title}` },
        },
      });
    }

    // Engraving is its own Stripe line at the server's price, per piece.
    if (engraving) {
      lineItems.push({
        quantity: line.quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: ENGRAVING_PRICE_PENCE,
          product_data: { name: `Engraving — ${result.title}` },
        },
      });
    }

    if (notes) notesMeta[`n${fulfillmentLines.length}`] = notes;
    fulfillmentLines.push({
      p: line.productId,
      v: line.variantKey,
      q: line.quantity,
      ...(customSize ? { s: customSize } : {}),
      ...(engraving ? { e: engraving } : {}),
      ...(largeSizeGBP ? { x: largeSizeGBP } : {}),
    });
    if (customSize) {
      madeToOrderItems.push(
        `${result.title} (size ${customSize}${engraving ? `, engraving “${engraving}”` : ''})`
      );
    }
    subtotalPence +=
      (variant.priceGBP + (engraving ? ENGRAVING_PRICE_PENCE : 0) + largeSizeGBP) * line.quantity;
  }

  const { country, email, remind, recoveredFrom } = parsed.data;
  const shipping = shippingQuote(country, subtotalPence);
  // Outside the UK the buyer pays import charges on delivery (DAP). Said again
  // inside Stripe's form, right under the address, so it is in front of them
  // at the moment they commit — not only on the page around the iframe.
  const dutiesNotice = importChargesNotice(country);

  // Compact fulfillment map for the webhook. Stripe metadata values cap at 500
  // chars and a session holds at most 50 keys (`cart`, `remind`, `rf` and one
  // per noted line); guard both. (Large carts → future: persist a draft order + reference.)
  const cartMeta = JSON.stringify(fulfillmentLines);
  if (cartMeta.length > 490 || Object.keys(notesMeta).length > 47) {
    return NextResponse.json(
      { error: 'Cart too large. Please split your order.' },
      { status: 400 }
    );
  }

  // `branding_settings` is supported at our pinned apiVersion (verified
  // directly against the API) but missing from the installed stripe SDK's
  // (17.7.0) type definitions — extend the param type rather than upgrade
  // the SDK for this.
  type SessionCreateParamsWithBranding =
    import('stripe').Stripe.Checkout.SessionCreateParams & {
      branding_settings?: { background_color?: string };
    };

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: lineItems,
      return_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      // The address from our email step: Stripe shows it filled in, and it's
      // where a reminder goes if this checkout expires unpaid.
      ...(email ? { customer_email: email } : {}),
      // Unpaid checkouts expire (and can get their reminder) after four hours
      // rather than Stripe's default 24, while the visit is still fresh.
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_MINUTES * 60,
      // Embedded Checkout renders in a Stripe-owned iframe — host CSS can't
      // reach it (same-origin policy), so the background is set server-side
      // to match the site's cararra background instead of Stripe's default white.
      branding_settings: { background_color: '#F1F0ED' },
      automatic_tax: { enabled: false },
      shipping_address_collection: { allowed_countries: [country] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: shipping.label,
            fixed_amount: { amount: shipping.amountPence, currency: 'gbp' },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      // Stripe caps each message at 1200 chars.
      ...(madeToOrderItems.length || dutiesNotice
        ? {
            custom_text: {
              ...(dutiesNotice
                ? { shipping_address: { message: dutiesNotice.slice(0, 1200) } }
                : {}),
              // Said once more right above the Pay button, so the lead time is
              // agreed to, not just seen on the product page.
              ...(madeToOrderItems.length
                ? {
                    submit: {
                      message: `Made to order, ships in ${MADE_TO_ORDER_LEAD_TIME}: ${madeToOrderItems.join(', ')}`.slice(
                        0,
                        1200
                      ),
                    },
                  }
                : {}),
            },
          }
        : {}),
      metadata: {
        cart: cartMeta,
        ...notesMeta,
        remind: email && remind !== false ? '1' : '0',
        ...(recoveredFrom ? { rf: recoveredFrom } : {}),
      },
    } as SessionCreateParamsWithBranding);

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('[checkout] session create failed', err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
}
