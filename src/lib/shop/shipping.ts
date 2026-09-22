/**
 * Shipping rates — the single source of truth.
 *
 * Read by the checkout API (which charges them), the checkout page (which
 * shows them before Stripe loads), the cart, the /shipping page and product
 * structured data. Change a rate here and every one of those follows.
 *
 * All amounts are in pence, like every other price in the store.
 *
 * Stripe's embedded checkout cannot price shipping from the address the buyer
 * types (and Apple Pay / Google Pay would skip that step anyway), so the
 * destination country is chosen first — pre-filled from the visitor's
 * location — and each Checkout Session only accepts an address in that one
 * country. That's what makes a flat UK/international split enforceable.
 */

export const SHIP_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IE', name: 'Ireland' },
] as const;

export type ShipCountry = (typeof SHIP_COUNTRIES)[number]['code'];

export const SHIP_COUNTRY_CODES = SHIP_COUNTRIES.map((c) => c.code) as [
  ShipCountry,
  ...ShipCountry[],
];

export const HOME_COUNTRY: ShipCountry = 'GB';

export const SHIPPING_RATES = {
  domesticPence: 499,
  internationalPence: 999,
  /** Orders whose goods total reaches this ship free, to every country. */
  freeFromPence: 30000,
} as const;

export function isShipCountry(code: string | null | undefined): code is ShipCountry {
  return SHIP_COUNTRY_CODES.includes(code as ShipCountry);
}

export function countryName(code: ShipCountry): string {
  return SHIP_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export interface ShippingQuote {
  amountPence: number;
  /** Shown as the shipping line in Stripe's checkout and on the order. */
  label: string;
}

/** What shipping costs for a goods subtotal (pence) sent to `country`. */
export function shippingQuote(country: ShipCountry, subtotalPence: number): ShippingQuote {
  const domestic = country === HOME_COUNTRY;
  if (subtotalPence >= SHIPPING_RATES.freeFromPence) {
    return {
      amountPence: 0,
      label: domestic ? 'Free UK tracked delivery' : 'Free international tracked delivery',
    };
  }
  return domestic
    ? { amountPence: SHIPPING_RATES.domesticPence, label: 'UK tracked delivery' }
    : { amountPence: SHIPPING_RATES.internationalPence, label: 'International tracked delivery' };
}

/** "£4.99", "£300" — whole pounds drop the pence. */
export function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}
