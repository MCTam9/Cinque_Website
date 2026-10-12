/**
 * The checkout page's email step — shared by the page and the checkout API.
 * See src/lib/stripe/cartReminder.ts for what happens to an unpaid checkout.
 */

/** How long an unpaid Stripe checkout stays open before it expires. */
export const CHECKOUT_EXPIRES_MINUTES = 120;

/** The opt-out tickbox under the email field. */
export const REMINDER_OPT_OUT_LABEL = 'Don’t email me a reminder if I don’t finish checking out';

/** A light check before the server's own; Stripe validates it again. */
export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/**
 * Hand-off from /cart/restore (a reminder link) to the checkout page, and the
 * email typed on the checkout page, kept for this tab only.
 */
export const CHECKOUT_PREFILL_KEY = 'cinque-checkout';

export interface CheckoutPrefill {
  email?: string | null;
  country?: string | null;
  /** The expired checkout the reminder link came from. */
  recoveredFrom?: string | null;
}

export function readPrefill(): CheckoutPrefill {
  try {
    return JSON.parse(sessionStorage.getItem(CHECKOUT_PREFILL_KEY) ?? '{}') as CheckoutPrefill;
  } catch {
    return {};
  }
}

export function writePrefill(prefill: CheckoutPrefill): void {
  try {
    sessionStorage.setItem(CHECKOUT_PREFILL_KEY, JSON.stringify({ ...readPrefill(), ...prefill }));
  } catch {
    // Private mode or storage blocked: the buyer just types it again.
  }
}
