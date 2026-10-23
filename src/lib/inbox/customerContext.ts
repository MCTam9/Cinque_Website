import 'server-only';
import { stripe } from '@/lib/stripe';
import { sanityWriteClient } from '@/lib/sanity/writeClient';
import { emailKey } from '@/lib/stripe/cartReminder';
import { carrierLabel, trackingUrl } from '@/lib/fulfillment/tracking';
import { MADE_TO_ORDER_LEAD_TIME } from '@/lib/shop/madeToOrder';
import { makingTarget } from '@/sanity/tools/orders/data';

/**
 * What the inbox agent may know about the person who wrote in: their own
 * orders and unpaid checkouts, found by THEIR email address only. An order
 * number quoted in the email is never looked up on its own, so an email can't
 * pull in somebody else's order. No street address or phone, ever.
 */

export interface CustomerOrder {
  orderNumber?: string;
  paidOn?: string;
  status?: string;
  kind: 'website' | 'bespoke';
  items: {
    title: string;
    quantity: number;
    size?: string;
    largerSize?: boolean;
    engraving?: string;
    customerNotes?: string;
    madeToOrder?: boolean;
  }[];
  totalGBP?: string;
  shipsTo?: string;
  /** For made-to-order pieces: what the customer was told (8–12 weeks from payment). */
  quotedDispatchWindow?: string;
  /** The studio's internal ship-by target. Never quote it as a promise. */
  internalShipBy?: string;
  shippedOn?: string;
  carrier?: string;
  trackingUrl?: string | null;
}

export interface CustomerContext {
  /** True when nothing at all was found for this address. */
  newCustomer: boolean;
  orders: CustomerOrder[];
  unpaidCheckouts: { startedOn?: string; items: string[]; paidLater: boolean }[];
}

const pounds = (pence?: number) =>
  typeof pence === 'number' ? `£${(pence / 100).toFixed(pence % 100 ? 2 : 0)}` : undefined;
const day = (iso?: string) => iso?.slice(0, 10);

function addWeeks(iso: string, weeks: number): string {
  return new Date(Date.parse(iso) + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}

/** Paid Stripe checkout sessions for `email` in the last two years. */
async function paidSessionIds(
  email: string
): Promise<{ id: string; city?: string; country?: string }[]> {
  const variants = [...new Set([email, email.toLowerCase()])];
  const since = Math.floor(Date.now() / 1000) - 2 * 365 * 86_400;
  const found = new Map<string, { id: string; city?: string; country?: string }>();
  for (const v of variants) {
    const page = await stripe.checkout.sessions.list({
      customer_details: { email: v },
      created: { gte: since },
      status: 'complete',
      limit: 50,
    });
    for (const s of page.data) {
      const addr =
        (
          s as unknown as {
            collected_information?: {
              shipping_details?: { address?: { city?: string; country?: string } };
            };
          }
        ).collected_information?.shipping_details?.address ??
        s.shipping_details?.address ??
        s.customer_details?.address;
      found.set(s.id, {
        id: s.id,
        city: addr?.city ?? undefined,
        country: addr?.country ?? undefined,
      });
    }
  }
  return [...found.values()];
}

interface OrderDoc {
  orderNumber?: string;
  status?: string;
  source?: string;
  stripeSessionId?: string;
  totalGBP?: number;
  createdAt?: string;
  carrier?: string;
  tracking?: string;
  shippedAt?: string;
  targetShipDate?: string;
  lines?: {
    titleSnapshot?: string;
    sku?: string;
    quantity?: number;
    madeToOrder?: boolean;
    customSize?: string;
    engraving?: string;
    largeSizeGBP?: number;
    notes?: string;
  }[];
  bespoke?: { size?: string; engraving?: string; description?: string; title?: string } | null;
}

export async function customerContext(email: string): Promise<CustomerContext> {
  const sessions = await paidSessionIds(email).catch((err) => {
    console.error('[inbox] Stripe lookup failed', err);
    return [];
  });
  const where = new Map(sessions.map((s) => [s.id, s]));

  const { orders, unpaid } = await sanityWriteClient.fetch<{
    orders: OrderDoc[];
    unpaid: {
      lastCheckoutAt?: string;
      recoveredAt?: string;
      items?: { title?: string; size?: string; quantity?: number }[];
    }[];
  }>(
    `{
      "orders": *[_type == "order" && stripeSessionId in $ids] | order(createdAt desc)[0...20]{
        orderNumber, status, source, stripeSessionId, totalGBP, createdAt,
        "carrier": fulfillment.carrier, "tracking": fulfillment.trackingNumber,
        "shippedAt": fulfillment.shippedAt, "targetShipDate": fulfillment.targetShipDate,
        lines[]{ titleSnapshot, sku, quantity, madeToOrder, customSize, engraving, largeSizeGBP, notes },
        "bespoke": select(source == "payment_link" && defined(orderNumber) =>
          *[_type == "bespokeOrder" && orderNumber == ^.orderNumber][0]{ size, engraving, description, title })
      },
      "unpaid": *[_type == "abandonedCheckout" && emailKey == $key] | order(lastCheckoutAt desc)[0...5]{
        lastCheckoutAt, recoveredAt, items[]{ title, size, quantity }
      }
    }`,
    { ids: sessions.map((s) => s.id), key: emailKey(email) }
  );

  const out: CustomerOrder[] = orders.map((o) => {
    const bespoke = o.source === 'payment_link';
    const making = bespoke || (o.lines ?? []).some((l) => l.madeToOrder);
    const place = o.stripeSessionId ? where.get(o.stripeSessionId) : undefined;
    const items: CustomerOrder['items'] = (o.lines ?? []).map((l) => ({
      title: l.titleSnapshot || l.sku || 'Item',
      quantity: l.quantity ?? 1,
      size: l.customSize || (bespoke ? o.bespoke?.size : undefined) || undefined,
      largerSize: l.largeSizeGBP ? true : undefined,
      engraving: l.engraving || (bespoke ? o.bespoke?.engraving : undefined) || undefined,
      customerNotes: l.notes || undefined,
      madeToOrder: l.madeToOrder || bespoke || undefined,
    }));
    if (bespoke && items.length === 0) {
      items.push({
        title: o.bespoke?.title || o.bespoke?.description || 'Bespoke piece',
        quantity: 1,
        size: o.bespoke?.size,
        engraving: o.bespoke?.engraving,
        madeToOrder: true,
      });
    }
    return {
      orderNumber: o.orderNumber,
      paidOn: day(o.createdAt),
      status: o.status ?? 'paid',
      kind: bespoke ? 'bespoke' : 'website',
      items,
      totalGBP: pounds(o.totalGBP),
      shipsTo: [place?.city, place?.country].filter(Boolean).join(', ') || undefined,
      ...(making && o.createdAt && !o.shippedAt
        ? {
            quotedDispatchWindow: `${MADE_TO_ORDER_LEAD_TIME} from payment: ${addWeeks(o.createdAt, 8)} to ${addWeeks(o.createdAt, 12)}`,
            internalShipBy: o.targetShipDate || makingTarget(o.createdAt),
          }
        : {}),
      shippedOn: day(o.shippedAt),
      carrier: carrierLabel(o.carrier) || undefined,
      trackingUrl: o.tracking ? trackingUrl(o.carrier, o.tracking) : undefined,
    };
  });

  const unpaidCheckouts = unpaid.map((u) => ({
    startedOn: day(u.lastCheckoutAt),
    items: (u.items ?? []).map((i) =>
      [i.title, i.size && `size ${i.size}`, (i.quantity ?? 1) > 1 && `× ${i.quantity}`]
        .filter(Boolean)
        .join(', ')
    ),
    paidLater: Boolean(u.recoveredAt),
  }));

  return {
    newCustomer: out.length === 0 && unpaidCheckouts.length === 0,
    orders: out,
    unpaidCheckouts,
  };
}

/** Whether `email` has paid for anything since `sinceMs` (an enquiry that turned into an order). */
export async function orderedSince(email: string, sinceMs: number): Promise<boolean> {
  try {
    const page = await stripe.checkout.sessions.list({
      customer_details: { email },
      created: { gte: Math.floor(sinceMs / 1000) },
      status: 'complete',
      limit: 1,
    });
    return page.data.length > 0;
  } catch {
    return false;
  }
}
