import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { sanityClient } from '@/lib/sanity/client';
import { variantForCheckoutQuery } from '@/lib/sanity/queries';
import { publicEnv } from '@/lib/env';
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
      })
    )
    .min(1)
    .max(50),
});

type VariantResult = {
  _id: string;
  title: string;
  status: string;
  variant: {
    _key: string;
    sku: string;
    priceGBP: number;
    stripeProductId?: string;
    stripePriceId?: string;
    stockQuantity: number;
    allowBackorder?: boolean;
  } | null;
};

export async function POST(req: Request) {
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

    if (!variant.allowBackorder && variant.stockQuantity < line.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${variant.sku}.` },
        { status: 409 }
      );
    }

    // Prefer a synced Stripe Price for integrity; fall back to server price_data.
    if (variant.stripePriceId) {
      lineItems.push({ price: variant.stripePriceId, quantity: line.quantity });
    } else {
      // No synced Price yet (sync pending/failed). Build the price server-side
      // from the trusted Sanity amount. If the variant already has a synced
      // Stripe PRODUCT, attach to it so the mapping stays closed — otherwise
      // create a named ad-hoc product as a last resort.
      const priceData: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem.PriceData =
        variant.stripeProductId
          ? {
              currency: 'gbp',
              unit_amount: variant.priceGBP, // already in pence
              product: variant.stripeProductId,
            }
          : {
              currency: 'gbp',
              unit_amount: variant.priceGBP,
              product_data: { name: `${result.title} — ${variant.sku}` },
            };
      lineItems.push({ quantity: line.quantity, price_data: priceData });
    }

    fulfillmentLines.push({ p: line.productId, v: line.variantKey, q: line.quantity });
  }

  // Compact fulfillment map for the webhook. Stripe metadata values cap at 500
  // chars; guard it. (Large carts → future: persist a draft order + reference.)
  const cartMeta = JSON.stringify(fulfillmentLines);
  if (cartMeta.length > 490) {
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
      // Embedded Checkout renders in a Stripe-owned iframe — host CSS can't
      // reach it (same-origin policy), so the background is set server-side
      // to match the site's cararra background instead of Stripe's default white.
      branding_settings: { background_color: '#F1F0ED' },
      automatic_tax: { enabled: false },
      shipping_address_collection: { allowed_countries: ['GB', 'US', 'FR', 'DE', 'IE'] },
      phone_number_collection: { enabled: true },
      metadata: { cart: cartMeta },
    } as SessionCreateParamsWithBranding);

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('[checkout] session create failed', err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
}
