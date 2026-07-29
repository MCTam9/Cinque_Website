import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { serverEnv } from '@/lib/serverEnv';
import { sanityWriteClient } from '@/lib/sanity/writeClient';
import { urlFor } from '@/lib/sanity/image';
import { createShipment } from '@/lib/fulfillment/shipping';
import { sendOrderConfirmation, sendLowStockAlert } from '@/lib/fulfillment/email';
import { reconcileProductStatus, collectLowStock } from '@/lib/inventory';
import type { FulfillmentLine } from '@/types';

// Stripe signature verification uses Node crypto — Edge would break it.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  // ── CRITICAL: read the RAW body. Do NOT parse JSON before verifying, or the
  // cryptographic signature check will fail. req.text() preserves the exact bytes.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  // ── Idempotency: Stripe delivers at-least-once and retries on non-2xx.
  // If we've already recorded this event, acknowledge and stop.
  try {
    const already = await sanityWriteClient.getDocument(event.id);
    if (already) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error('[webhook] idempotency check failed', err);
    // Fall through — better to attempt processing than to drop the event.
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      // Extend here: payment_intent.payment_failed, dispute events, etc.
      default:
        // Ignore unhandled types but still record them below.
        break;
    }

    // Record the event AFTER successful handling so a mid-run failure lets
    // Stripe retry. (Narrow duplicate-delivery race is acceptable for v1.)
    await sanityWriteClient.createOrReplace({
      _id: event.id,
      _type: 'stripeEvent',
      type: event.type,
      processedAt: new Date().toISOString(),
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error', err);
    // Return 500 so Stripe retries the delivery.
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(sessionStub: Stripe.Checkout.Session) {
  // Retrieve a fresh, complete session (shipping/customer details reliably present).
  const session = await stripe.checkout.sessions.retrieve(sessionStub.id);

  if (session.payment_status !== 'paid') {
    // Only fulfill genuinely paid sessions.
    return;
  }

  const orderId = `order.${session.id}`;

  // ── IDEMPOTENCY GUARD — keyed on the ORDER, not the event. ──
  // The stripeEvent ledger is written only AFTER this function returns, so it
  // cannot protect the work inside it: if fulfillment succeeds and that ledger
  // write then fails, we answer 500, Stripe retries, the ledger still shows
  // nothing, and we land back here. createIfNotExists makes the order itself
  // safe to repeat — but the stock decrement below is a `dec()` and the
  // confirmation email is a send, and BOTH would run a second time.
  //
  // The order doc is the real unit of work, so gate on it. Any repeat delivery
  // — retry after a partial failure, or a concurrent duplicate that lost the
  // race to create it — stops here having changed nothing.
  const existingOrder = await sanityWriteClient.getDocument(orderId);
  if (existingOrder) {
    console.info('[webhook] order already fulfilled, skipping', orderId);
    return;
  }

  // Parse the compact fulfillment map written at checkout creation.
  let fulfillmentLines: FulfillmentLine[] = [];
  try {
    fulfillmentLines = JSON.parse(session.metadata?.cart ?? '[]');
  } catch {
    console.error('[webhook] could not parse cart metadata for', session.id);
  }

  // Resolve SKUs/titles/prices from Sanity for the order snapshot.
  const orderLines = [];
  for (const fl of fulfillmentLines) {
    const doc = await sanityWriteClient.fetch(
      `*[_type == "product" && _id == $pid][0]{
        _id, title,
        "image": images[0],
        "variant": variants[_key == $vkey][0]{ _key, sku, priceGBP }
      }`,
      { pid: fl.p, vkey: fl.v }
    );
    if (!doc?.variant) continue;
    // Square thumbnail for the confirmation email. Retina: request 2x (112px)
    // for a 56px display. imageUrl is email-only — kept off the order snapshot.
    const imageUrl = doc.image
      ? urlFor(doc.image).width(112).height(112).fit('crop').url()
      : null;
    orderLines.push({
      _key: `${fl.p}-${fl.v}`,
      _type: 'orderLine',
      product: { _type: 'reference', _ref: fl.p, _weak: true },
      variantKey: fl.v,
      sku: doc.variant.sku as string,
      titleSnapshot: doc.title as string,
      quantity: fl.q,
      unitPriceGBP: doc.variant.priceGBP as number,
      imageUrl,
    });
  }

  const now = new Date();
  const orderNumber = `CQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${session.id.slice(-8).toUpperCase()}`;

  const shipping =
    // Newer API: collected_information.shipping_details; fall back to customer address.
    (session as unknown as { collected_information?: { shipping_details?: Stripe.Checkout.Session.ShippingDetails } })
      .collected_information?.shipping_details ?? session.shipping_details ?? null;
  const address = shipping?.address ?? session.customer_details?.address ?? null;

  // ── Inventory deduction + order creation in ONE atomic transaction. ──
  const tx = sanityWriteClient.transaction();

  tx.createIfNotExists({
    _id: orderId,
    _type: 'order',
    orderNumber,
    status: 'paid',
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    customer: {
      email: session.customer_details?.email ?? null,
      name: shipping?.name ?? session.customer_details?.name ?? null,
      phone: session.customer_details?.phone ?? null,
      shippingAddress: address
        ? {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            postalCode: address.postal_code,
            country: address.country,
          }
        : null,
    },
    // imageUrl is derived (email-only) — keep it out of the persisted snapshot.
    lines: orderLines.map(({ imageUrl: _imageUrl, ...persisted }) => persisted),
    totalGBP: session.amount_total ?? 0,
    currency: session.currency ?? 'gbp',
    createdAt: now.toISOString(),
  });

  // Atomic per-variant stock decrement. Oversell is already prevented at
  // checkout (server-side stock check), so a negative here should not occur;
  // if it does, it surfaces as negative stock for staff to notice rather than
  // being silently hidden. (A hard reservation at session creation is the
  // future upgrade — see the plan's documented v1 tradeoff.)
  for (const fl of fulfillmentLines) {
    tx.patch(fl.p, (p) =>
      p.dec({ [`variants[_key=="${fl.v}"].stockQuantity`]: fl.q })
    );
  }

  await tx.commit({ autoGenerateArrayKeys: false });

  // ── AUTO INVENTORY STATUS + LOW-STOCK ALERT ──
  // Flip products to "sold out" automatically and warn the owner when a SKU
  // drops to its threshold. Best-effort; never fails the webhook.
  try {
    const docs = await reconcileProductStatus(fulfillmentLines.map((fl) => fl.p));
    const low = collectLowStock(docs);
    if (low.length > 0) await sendLowStockAlert({ items: low });
  } catch (err) {
    console.error('[webhook] status/low-stock reconcile error', err);
  }

  // ── POST-PURCHASE OPERATIONS (placeholders) ──
  // Isolated so a failure here never fails the webhook (idempotency + the
  // recorded event mean we won't re-run inventory on retry anyway).
  try {
    await createShipment({
      orderId,
      orderNumber,
      email: session.customer_details?.email,
      shippingAddress: address
        ? {
            name: shipping?.name ?? session.customer_details?.name,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            postalCode: address.postal_code,
            country: address.country,
          }
        : null,
      lines: orderLines.map((l) => ({ sku: l.sku, title: l.titleSnapshot, quantity: l.quantity })),
    });
  } catch (err) {
    console.error('[webhook] shipping placeholder error', err);
  }

  try {
    await sendOrderConfirmation({
      to: session.customer_details?.email,
      orderNumber,
      lines: orderLines.map((l) => ({
        title: l.titleSnapshot,
        sku: l.sku,
        quantity: l.quantity,
        unitPriceGBP: l.unitPriceGBP,
        imageUrl: l.imageUrl,
      })),
      totalGBP: session.amount_total ?? 0,
      currency: session.currency ?? 'gbp',
    });
  } catch (err) {
    console.error('[webhook] email placeholder error', err);
  }
}

/**
 * Refund automation. When the owner issues a full refund from the Stripe
 * dashboard, Stripe sends charge.refunded — we restock the items and mark the
 * order 'refunded' so the store stays consistent with zero manual work.
 * (Partial refunds are logged but do not auto-restock — that needs a human.)
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const isFullRefund =
    charge.refunded && charge.amount_refunded === charge.amount;

  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = (await sanityWriteClient.fetch(
    `*[_type == "order" && stripePaymentIntentId == $pi][0]{
      _id, status,
      "lines": lines[]{ "pid": product._ref, variantKey, quantity }
    }`,
    { pi: paymentIntentId }
  )) as {
    _id: string;
    status: string;
    lines?: Array<{ pid?: string; variantKey?: string; quantity?: number }>;
  } | null;

  if (!order) {
    console.warn('[webhook] refund: no order for PI', paymentIntentId);
    return;
  }
  if (order.status === 'refunded') return; // already handled

  if (!isFullRefund) {
    // Flag partial refunds for staff attention without auto-restocking.
    await sanityWriteClient
      .patch(order._id)
      .set({ notes: 'Partial refund received — review inventory manually.' })
      .commit();
    return;
  }

  const tx = sanityWriteClient.transaction();
  tx.patch(order._id, (p) => p.set({ status: 'refunded' }));
  for (const l of order.lines ?? []) {
    const qty = l.quantity ?? 0;
    if (l.pid && l.variantKey && qty > 0) {
      tx.patch(l.pid, (p) =>
        p.inc({ [`variants[_key=="${l.variantKey}"].stockQuantity`]: qty })
      );
    }
  }
  await tx.commit({ autoGenerateArrayKeys: false });

  // Restock may re-activate a sold-out product.
  try {
    await reconcileProductStatus(
      (order.lines ?? []).map((l) => l.pid).filter(Boolean) as string[]
    );
  } catch (err) {
    console.error('[webhook] refund status reconcile error', err);
  }
}
