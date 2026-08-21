import 'server-only';
import { stripe } from '@/lib/stripe';

/**
 * Buyer contact details, read from Stripe on demand.
 *
 * Stripe is the system of record for everything identifying about a customer.
 * The Sanity `order` document deliberately stores none of it — the dataset is
 * public on the free plan — so anything that needs to reach or address the
 * buyer resolves it here, from the Checkout Session, using the secret key.
 */
export interface OrderContact {
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
}

const EMPTY: OrderContact = { email: null, name: null, phone: null, address: null };

/**
 * Pull the contact block out of an already-retrieved Session, preferring the
 * shipping details the buyer confirmed over the billing details on file.
 *
 * Split out from the fetch so the Stripe webhook — which already holds a fresh
 * Session — can reuse the same precedence rules without a second API call.
 */
export function contactFromSession(
  session: import('stripe').Stripe.Checkout.Session
): OrderContact {
  // Newer API: collected_information.shipping_details; fall back to customer address.
  const shipping =
    (
      session as unknown as {
        collected_information?: {
          shipping_details?: import('stripe').Stripe.Checkout.Session.ShippingDetails;
        };
      }
    ).collected_information?.shipping_details ??
    session.shipping_details ??
    null;
  const address = shipping?.address ?? session.customer_details?.address ?? null;

  return {
    email: session.customer_details?.email ?? null,
    name: shipping?.name ?? session.customer_details?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    address: address
      ? {
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          postalCode: address.postal_code,
          country: address.country,
        }
      : null,
  };
}

/**
 * Resolve the buyer for a Sanity order, given the session id stored on it.
 *
 * Never throws: callers are fulfilment side-effects (a shipping email, a
 * carrier handoff) where a Stripe hiccup must not fail the surrounding
 * webhook. An unresolvable buyer comes back as all-nulls and the caller
 * decides — sending nothing is the correct outcome, not a retry storm.
 */
export async function getOrderContact(
  sessionId: string | null | undefined
): Promise<OrderContact> {
  if (!sessionId) return EMPTY;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return contactFromSession(session);
  } catch (err) {
    console.error('[stripe/customer] could not retrieve session', sessionId, err);
    return EMPTY;
  }
}
