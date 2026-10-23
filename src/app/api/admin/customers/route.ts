import { NextResponse } from 'next/server';
import { z } from 'zod';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { isStudioEditor } from '@/lib/adminAuth';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { contactFromSession, type OrderContact } from '@/lib/stripe/customer';
import type { FulfillmentLine } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/customers — buyer details for the Admin's Orders table.
 *
 * Orders and unpaid checkouts in Sanity hold no customer details (the dataset
 * is public); Stripe is the system of record. The table sends the checkout
 * session ids it is showing, and this reads name, email, phone and shipping
 * address from each session, the delivery option paid for (for choosing the
 * courier service), plus, for unpaid checkouts, the engraving and notes the
 * customer had entered (orders keep those on their lines already).
 * Nothing here is stored or logged.
 *
 * Only for people signed in to the Studio: the request carries the user's
 * Sanity login token, checked against Sanity's /users/me, and the account must
 * be a person (not an API token) with an administrator or editor role.
 */

const MAX_SESSIONS = 150;
const STRIPE_CONCURRENCY = 5;
const CACHE_MS = 5 * 60_000;

const bodySchema = z.object({
  sessionIds: z
    .array(z.string().regex(/^cs_(live|test)_[A-Za-z0-9]+$/))
    .max(MAX_SESSIONS),
});

export interface AdminCustomer extends OrderContact {
  /** The shipping rate chosen at checkout, e.g. "Express"; null if none. */
  shippingService: string | null;
  /** Unpaid checkouts only: what the customer had entered per cart line. */
  lines?: { engraving?: string; notes?: string }[];
}

// Per-instance caches: a few minutes is enough to make the table's live
// refreshes cheap without serving details that are long out of date.
const sessionCache = new Map<string, { at: number; data: AdminCustomer }>();

/** The engraving and notes an unpaid checkout carried, per cart line. */
function unpaidLines(session: Stripe.Checkout.Session): AdminCustomer['lines'] {
  let cart: FulfillmentLine[] = [];
  try {
    cart = JSON.parse(session.metadata?.cart ?? '[]');
  } catch {
    return undefined;
  }
  const lines = cart.map((fl, i) => ({
    ...(fl.e ? { engraving: fl.e } : {}),
    ...(session.metadata?.[`n${i}`] ? { notes: session.metadata[`n${i}`] } : {}),
  }));
  return lines.some((l) => l.engraving || l.notes) ? lines : undefined;
}

async function customerFor(id: string): Promise<AdminCustomer | null> {
  const hit = sessionCache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  try {
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['shipping_cost.shipping_rate'],
    });
    const contact = contactFromSession(session);
    const rate = session.shipping_cost?.shipping_rate;
    const data: AdminCustomer = {
      ...contact,
      // Unpaid checkouts carry the address from the site's email step.
      email: contact.email ?? session.customer_email ?? null,
      shippingService: (rate && typeof rate === 'object' ? rate.display_name : null) ?? null,
      ...(session.status !== 'complete' ? { lines: unpaidLines(session) } : {}),
    };
    sessionCache.set(id, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (rateLimit(`admin-customers:${clientIp(req)}`, { windowMs: 60_000, max: 30 })) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/)?.[1];
  if (!token || !(await isStudioEditor(token))) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const ids = [...new Set(parsed.data.sessionIds)];
  const customers: Record<string, AdminCustomer> = {};
  // A few at a time: well inside Stripe's rate limits for ~150 rows.
  for (let i = 0; i < ids.length; i += STRIPE_CONCURRENCY) {
    const batch = ids.slice(i, i + STRIPE_CONCURRENCY);
    const found = await Promise.all(batch.map(customerFor));
    batch.forEach((id, j) => {
      if (found[j]) customers[id] = found[j];
    });
  }

  return NextResponse.json({ customers }, { headers: { 'Cache-Control': 'no-store' } });
}
