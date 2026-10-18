/**
 * Data for the Admin's Orders table: one GROQ read across orders, unpaid
 * checkouts and open bespoke links, flattened into rows the table can sort,
 * filter and search together.
 *
 * Nothing here holds customer details; those come from Stripe at view time
 * (/api/admin/customers) and are joined in by checkout session id.
 */

export const ORDER_STATUSES = [
  { value: 'paid', title: 'Paid' },
  { value: 'fulfilling', title: 'Fulfilling' },
  { value: 'shipped', title: 'Shipped' },
  { value: 'delivered', title: 'Delivered' },
  { value: 'refunded', title: 'Refunded' },
  { value: 'cancelled', title: 'Cancelled' },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value'];

/** Newest first, enough to cover months of orders without paging. */
const LIMIT = 150;

export const TABLE_QUERY = `{
  "orders": *[_type == "order"] | order(createdAt desc)[0...${LIMIT}]{
    _id, orderNumber, status, source, addressWarning, stripeSessionId, totalGBP, createdAt,
    "carrier": fulfillment.carrier,
    "tracking": fulfillment.trackingNumber,
    "shippedAt": fulfillment.shippedAt,
    "emailedAt": fulfillment.shippedEmailSentAt,
    lines[]{ _key, titleSnapshot, sku, quantity, customSize, engraving, largeSizeGBP, notes }
  },
  "unpaid": *[_type == "abandonedCheckout"] | order(lastCheckoutAt desc)[0...${LIMIT}]{
    _id, lastCheckoutAt, stripeSessionId, country, valueGBP, reminderSentAt, optedOut,
    recoveredAt, orderNumber,
    items[]{ _key, title, sku, quantity, size }
  },
  "links": *[_type == "bespokeOrder" && status == "ready" && cancelled != true]
    | order(_createdAt desc)[0...${LIMIT}]{
      _id, _createdAt, title, priceGBP, shipTo, paymentLinkUrl
    }
}`;

/** Re-read whenever any of these change. */
export const LISTEN_QUERY = `*[_type in ["order", "abandonedCheckout", "bespokeOrder"]]`;

interface OrderDoc {
  _id: string;
  orderNumber?: string;
  status?: OrderStatus;
  source?: string;
  addressWarning?: string;
  stripeSessionId?: string;
  totalGBP?: number;
  createdAt?: string;
  carrier?: string;
  tracking?: string;
  shippedAt?: string;
  emailedAt?: string;
  lines?: {
    _key: string;
    titleSnapshot?: string;
    sku?: string;
    quantity?: number;
    customSize?: string;
    engraving?: string;
    largeSizeGBP?: number;
    notes?: string;
  }[];
}

interface UnpaidDoc {
  _id: string;
  lastCheckoutAt?: string;
  stripeSessionId?: string;
  country?: string;
  valueGBP?: number;
  reminderSentAt?: string;
  optedOut?: boolean;
  recoveredAt?: string;
  orderNumber?: string;
  items?: { _key: string; title?: string; sku?: string; quantity?: number; size?: string }[];
}

interface LinkDoc {
  _id: string;
  _createdAt: string;
  title?: string;
  priceGBP?: number;
  shipTo?: string;
  paymentLinkUrl?: string;
}

export interface TableData {
  orders: OrderDoc[];
  unpaid: UnpaidDoc[];
  links: LinkDoc[];
}

export interface RowLine {
  key: string;
  title: string;
  sku?: string;
  quantity: number;
  size?: string;
  largerSize?: boolean;
  engraving?: string;
  notes?: string;
}

export type RowKind = 'order' | 'bespokeOrder' | 'unpaid' | 'link';

export interface Row {
  id: string;
  /** Sanity type, for opening the record. */
  docType: 'order' | 'abandonedCheckout' | 'bespokeOrder';
  kind: RowKind;
  date?: string;
  orderNumber?: string;
  sessionId?: string;
  lines: RowLine[];
  /** Pence. Orders: what was charged (incl. shipping); unpaid: before shipping. */
  totalGBP?: number;
  country?: string;
  // Orders
  status?: OrderStatus;
  carrier?: string;
  tracking?: string;
  shippedAt?: string;
  emailedAt?: string;
  addressWarning?: string;
  // Unpaid checkouts
  reminderSentAt?: string;
  optedOut?: boolean;
  recoveredAt?: string;
  // Bespoke links
  paymentLinkUrl?: string;
}

export function toRows(data: TableData): Row[] {
  const orders: Row[] = data.orders.map((o) => ({
    id: o._id,
    docType: 'order',
    kind: o.source === 'payment_link' ? 'bespokeOrder' : 'order',
    date: o.createdAt,
    orderNumber: o.orderNumber,
    sessionId: o.stripeSessionId,
    totalGBP: o.totalGBP,
    status: o.status,
    carrier: o.carrier,
    tracking: o.tracking,
    shippedAt: o.shippedAt,
    emailedAt: o.emailedAt,
    addressWarning: o.addressWarning,
    lines: (o.lines ?? []).map((l) => ({
      key: l._key,
      title: l.titleSnapshot || l.sku || 'Item',
      sku: l.sku,
      quantity: l.quantity ?? 1,
      size: l.customSize || undefined,
      largerSize: Boolean(l.largeSizeGBP),
      engraving: l.engraving || undefined,
      notes: l.notes || undefined,
    })),
  }));

  const unpaid: Row[] = data.unpaid.map((u) => ({
    id: u._id,
    docType: 'abandonedCheckout',
    kind: 'unpaid',
    date: u.lastCheckoutAt,
    orderNumber: u.orderNumber,
    sessionId: u.stripeSessionId,
    totalGBP: u.valueGBP,
    country: u.country,
    reminderSentAt: u.reminderSentAt,
    optedOut: u.optedOut,
    recoveredAt: u.recoveredAt,
    lines: (u.items ?? []).map((i) => ({
      key: i._key,
      title: i.title || i.sku || 'Item',
      sku: i.sku,
      quantity: i.quantity ?? 1,
      size: i.size || undefined,
    })),
  }));

  const links: Row[] = data.links.map((b) => ({
    id: b._id,
    docType: 'bespokeOrder',
    kind: 'link',
    date: b._createdAt,
    totalGBP: b.priceGBP,
    country: b.shipTo && b.shipTo.length === 2 ? b.shipTo : undefined,
    paymentLinkUrl: b.paymentLinkUrl,
    lines: [{ key: 'piece', title: b.title || 'Bespoke piece', quantity: 1 }],
  }));

  return [...orders, ...unpaid, ...links].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  );
}

export const TABS = [
  { id: 'toFulfil', title: 'To fulfil' },
  { id: 'orders', title: 'All orders' },
  { id: 'unpaid', title: 'Unpaid checkouts' },
  { id: 'links', title: 'Bespoke links' },
  { id: 'all', title: 'Everything' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function inTab(row: Row, tab: TabId): boolean {
  const isOrder = row.kind === 'order' || row.kind === 'bespokeOrder';
  switch (tab) {
    case 'toFulfil':
      return isOrder && (row.status === 'paid' || row.status === 'fulfilling' || !row.status);
    case 'orders':
      return isOrder;
    case 'unpaid':
      return row.kind === 'unpaid';
    case 'links':
      return row.kind === 'link';
    default:
      return true;
  }
}

/** "£1,250" / "£209.99" from pence. */
export function money(pence?: number): string {
  if (typeof pence !== 'number') return '—';
  const pounds = pence / 100;
  return `£${pounds.toLocaleString('en-GB', {
    minimumFractionDigits: Number.isInteger(pounds) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "16 Oct, 09:54" in UK time. */
export function when(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}
