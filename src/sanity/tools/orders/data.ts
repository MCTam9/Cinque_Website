/**
 * Data for the Admin's Orders table: one GROQ read across orders, unpaid
 * checkouts and open bespoke links, flattened into rows the table can sort,
 * filter and search together.
 *
 * Nothing here holds customer details; those come from Stripe at view time
 * (/api/admin/customers) and are joined in by checkout session id.
 *
 * Bespoke links carry the same line fields as shop orders (size, engraving,
 * internal notes), so both render, search and export the same way.
 */

import { MAKING_TARGET_WEEKS } from '@/lib/shop/madeToOrder';

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
    _id, orderNumber, status, source, addressWarning, stripeSessionId, totalGBP, createdAt, notes,
    "carrier": fulfillment.carrier,
    "tracking": fulfillment.trackingNumber,
    "shippedAt": fulfillment.shippedAt,
    "emailedAt": fulfillment.shippedEmailSentAt,
    "targetShipDate": fulfillment.targetShipDate,
    lines[]{ _key, titleSnapshot, sku, quantity, madeToOrder, customSize, engraving, largeSizeGBP, notes },
    // Paid bespoke orders from before their lines carried size etc.: read the link instead.
    "bespoke": select(
      source == "payment_link" && defined(orderNumber) =>
        *[_type == "bespokeOrder" && orderNumber == ^.orderNumber][0]{ size, engraving, notes, description }
    )
  },
  "unpaid": *[_type == "abandonedCheckout"] | order(lastCheckoutAt desc)[0...${LIMIT}]{
    _id, lastCheckoutAt, stripeSessionId, country, valueGBP, reminderSentAt, optedOut,
    recoveredAt, orderNumber,
    items[]{ _key, title, sku, quantity, size }
  },
  "links": *[_type == "bespokeOrder" && status == "ready" && cancelled != true]
    | order(_createdAt desc)[0...${LIMIT}]{
      _id, _createdAt, title, priceGBP, shipTo, paymentLinkUrl, size, engraving, notes, description
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
  /** A ship-by date set by hand ("YYYY-MM-DD"), overriding the making target. */
  targetShipDate?: string;
  notes?: string;
  lines?: {
    _key: string;
    titleSnapshot?: string;
    sku?: string;
    quantity?: number;
    madeToOrder?: boolean;
    customSize?: string;
    engraving?: string;
    largeSizeGBP?: number;
    notes?: string;
  }[];
  bespoke?: BespokeFields | null;
}

/** What a bespoke link records about the piece (`notes` are staff-only). */
interface BespokeFields {
  size?: string;
  engraving?: string;
  notes?: string;
  /** "Details", shown to the customer on the payment page. */
  description?: string;
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
  items?: {
    _key: string;
    title?: string;
    sku?: string;
    quantity?: number;
    size?: string;
  }[];
}

interface LinkDoc extends BespokeFields {
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
  madeToOrder?: boolean;
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
  /** Bespoke "Details" (customer-facing description). */
  details?: string;
  // Orders
  /** The order's internal notes (staff-only). */
  internalNotes?: string;
  status?: OrderStatus;
  carrier?: string;
  tracking?: string;
  shippedAt?: string;
  emailedAt?: string;
  /** "YYYY-MM-DD": the order's own target date, else payment + the making target (made to order only). */
  shipBy?: string;
  addressWarning?: string;
  // Unpaid checkouts
  reminderSentAt?: string;
  optedOut?: boolean;
  recoveredAt?: string;
  // Bespoke links
  paymentLinkUrl?: string;
}

export function toRows(data: TableData): Row[] {
  const orders: Row[] = data.orders.map((o) => {
    const bespoke = o.source === 'payment_link';
    const b = o.bespoke ?? undefined;
    const making = bespoke || (o.lines ?? []).some((l) => l.madeToOrder);
    return {
      id: o._id,
      docType: 'order',
      kind: bespoke ? 'bespokeOrder' : 'order',
      date: o.createdAt,
      orderNumber: o.orderNumber,
      sessionId: o.stripeSessionId,
      totalGBP: o.totalGBP,
      status: o.status,
      carrier: o.carrier,
      tracking: o.tracking,
      shippedAt: o.shippedAt,
      emailedAt: o.emailedAt,
      shipBy: o.targetShipDate || (making && o.createdAt ? makingTarget(o.createdAt) : undefined),
      addressWarning: o.addressWarning,
      internalNotes: o.notes || undefined,
      details: b?.description || undefined,
      lines: (o.lines ?? []).map((l) => ({
        key: l._key,
        title: l.titleSnapshot || l.sku || 'Item',
        sku: l.sku,
        quantity: l.quantity ?? 1,
        // Bespoke pieces are always made to order, whatever older lines say.
        madeToOrder: Boolean(l.madeToOrder || bespoke),
        size: l.customSize || b?.size || undefined,
        largerSize: Boolean(l.largeSizeGBP),
        engraving: l.engraving || b?.engraving || undefined,
        notes: l.notes || b?.notes || undefined,
      })),
    };
  });

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
    details: b.description || undefined,
    lines: [
      {
        key: 'piece',
        title: b.title || 'Bespoke piece',
        quantity: 1,
        madeToOrder: true,
        size: b.size || undefined,
        engraving: b.engraving || undefined,
        notes: b.notes || undefined,
      },
    ],
  }));

  return [...orders, ...unpaid, ...links].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  );
}

/**
 * What /api/admin/customers returns per checkout session (read from Stripe at
 * view time, never stored).
 */
export interface Customer {
  email: string | null;
  name: string | null;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  /** The delivery option paid for at checkout, e.g. "Express". */
  shippingService?: string | null;
  lines?: { engraving?: string; notes?: string }[];
}

/** Each line's engraving and notes: from the order itself, or from Stripe for unpaid checkouts. */
export function lineExtras(row: Row, customer?: Customer) {
  return row.lines.map((l, i) => ({
    engraving: l.engraving ?? customer?.lines?.[i]?.engraving,
    notes: l.notes ?? customer?.lines?.[i]?.notes,
  }));
}

export const KIND_TITLE: Record<RowKind, string> = {
  order: 'Order',
  bespokeOrder: 'Bespoke order',
  unpaid: 'Unpaid',
  link: 'Bespoke link',
};

type Tone = 'default' | 'primary' | 'caution' | 'positive';

/** Where an unpaid checkout or bespoke link stands (orders have an editable status). */
export function pendingStatus(row: Row): { title: string; tone: Tone } {
  if (row.kind === 'link') return { title: 'Waiting for payment', tone: 'caution' };
  if (row.recoveredAt) {
    return {
      title: `Paid later${row.orderNumber ? ` (${row.orderNumber})` : ''}`,
      tone: 'positive',
    };
  }
  if (row.optedOut) return { title: 'Opted out of reminders', tone: 'default' };
  if (row.reminderSentAt) {
    return {
      title: `Reminder sent ${when(row.reminderSentAt)}`,
      tone: 'primary',
    };
  }
  return { title: 'No reminder', tone: 'caution' };
}

/** The status column as text, for export. */
export function statusText(row: Row): string {
  if (row.kind === 'order' || row.kind === 'bespokeOrder') {
    return ORDER_STATUSES.find((s) => s.value === (row.status ?? 'paid'))?.title ?? '';
  }
  return pendingStatus(row).title;
}

// ── Making target ──

const DAY = 86_400_000;

/** The UK calendar date of an instant, as "YYYY-MM-DD". */
function ukDate(at: Date | string): string {
  return new Date(at).toLocaleDateString('sv-SE', {
    timeZone: 'Europe/London',
  });
}

/** Payment (UK date) plus the studio's making target, as "YYYY-MM-DD". */
export function makingTarget(paidAt: string): string {
  const day = Date.parse(`${ukDate(paidAt)}T00:00:00Z`) + MAKING_TARGET_WEEKS * 7 * DAY;
  return new Date(day).toISOString().slice(0, 10);
}

/** "15 Nov" from "YYYY-MM-DD". */
export function shortDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/**
 * How an order stands against its ship-by date, while it's still to ship:
 * "in 12 days", "today" or "3 days late". Null once shipped (or with no date).
 */
export function shipByStatus(
  row: Row,
  now: Date = new Date()
): {
  date: string;
  note: string;
  tone: 'default' | 'caution' | 'critical';
} | null {
  if (!row.shipBy || !inTab(row, 'toFulfil')) return null;
  const days = Math.round(
    (Date.parse(`${row.shipBy}T00:00:00Z`) - Date.parse(`${ukDate(now)}T00:00:00Z`)) / DAY
  );
  const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
  return {
    date: shortDate(row.shipBy),
    note: days > 0 ? `in ${plural(days)}` : days === 0 ? 'today' : `${plural(-days)} late`,
    tone: days < 0 ? 'critical' : days <= 7 ? 'caution' : 'default',
  };
}

/**
 * "To fulfil" runs by urgency: earliest ship-by date first. An in-stock order
 * has no making time, so its payment date stands in and it sorts ahead.
 */
export function byUrgency(a: Row, b: Row): number {
  const due = (r: Row) => r.shipBy ?? (r.date ? ukDate(r.date) : '');
  return due(a).localeCompare(due(b)) || (a.date ?? '').localeCompare(b.date ?? '');
}

// ── Sorting by column ──

export type SortKey =
  'date' | 'type' | 'order' | 'customer' | 'items' | 'total' | 'status' | 'tracking';
export interface Sort {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const KIND_ORDER: RowKind[] = ['order', 'bespokeOrder', 'unpaid', 'link'];

/** Where a row sits in its Status column: order statuses in workflow order, then the rest. */
function statusRank(row: Row): string {
  if (row.kind === 'order' || row.kind === 'bespokeOrder') {
    const i = ORDER_STATUSES.findIndex((s) => s.value === (row.status ?? 'paid'));
    return `a${i}`;
  }
  return `b${pendingStatus(row).title}`;
}

/**
 * The column a click on its header sorts by. Empty cells always go last, in
 * either direction; ties fall back to newest first.
 */
export function sortRows(
  rows: Row[],
  sort: Sort,
  customerName: (row: Row) => string | undefined
): Row[] {
  const value = (row: Row): string | number | undefined => {
    switch (sort.key) {
      case 'date':
        return row.date;
      case 'type':
        return KIND_ORDER.indexOf(row.kind);
      case 'order':
        return row.orderNumber;
      case 'customer':
        return customerName(row)?.trim().toLowerCase() || undefined;
      case 'items':
        return row.lines[0]?.title.toLowerCase();
      case 'total':
        return row.totalGBP;
      case 'status':
        return statusRank(row);
      case 'tracking':
        // Still to ship: by ship-by date. Shipped: by tracking number.
        return row.shipBy ?? row.tracking;
    }
  };
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === undefined || va === '') return vb === undefined || vb === '' ? 0 : 1;
    if (vb === undefined || vb === '') return -1;
    const c =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'en-GB', { numeric: true });
    return c * sign || (b.date ?? '').localeCompare(a.date ?? '');
  });
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
