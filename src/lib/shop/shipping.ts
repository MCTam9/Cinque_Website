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

import { SHIP_COUNTRIES } from './shipCountries';

export { SHIP_COUNTRIES };

export type ShipCountry = (typeof SHIP_COUNTRIES)[number]['code'];

export const SHIP_COUNTRY_CODES = SHIP_COUNTRIES.map((c) => c.code) as [
  ShipCountry,
  ...ShipCountry[],
];

export const HOME_COUNTRY: ShipCountry = 'GB';

/**
 * Who pays import duties and taxes. Every international order is sent DAP:
 * the destination collects them from the recipient, and the site states that
 * duties, taxes and carrier handling fees are not included. 'none': domestic,
 * no customs. (If the studio ever prepays a destination's charges, e.g. Royal
 * Mail PDDP, give that country an 'included' case here.)
 *
 * There's no per-country customs link: with ~190 destinations the buyer is
 * pointed to one estimator below and their own customs authority instead.
 */
export function importCharges(country: ShipCountry): 'none' | 'included' | 'buyer' {
  return country === HOME_COUNTRY ? 'none' : 'buyer';
}

/** Third-party estimator, offered as a rough guide only — we quote no figures. */
export const DUTIES_CALCULATOR = {
  name: 'SimplyDuty',
  url: 'https://www.simplyduty.com/import-calculator/',
} as const;

/** The short, country-agnostic line for the PDP and cart. */
export const INTERNATIONAL_DUTIES_NOTE =
  'International orders: import duties and taxes are not included in the price and are payable by you on delivery.';

/** Checkout notice on import charges for `country`; null for the UK. */
export function importChargesNotice(country: ShipCountry): string | null {
  const charges = importCharges(country);
  if (charges === 'none') return null;
  if (charges === 'included') {
    return 'Import duties and taxes are included. There is nothing more to pay on delivery.';
  }
  return 'Import duties, taxes and any carrier handling fees are not included in your order total. They are set by the destination’s customs authority and are payable by you before or on delivery.';
}

/**
 * The same notice for a raw country code off a Stripe address (emails), which
 * may be anything; null for the UK or a code we don't ship to.
 */
export function importChargesNoticeFor(code: string | null | undefined): string | null {
  return isShipCountry(code) ? importChargesNotice(code) : null;
}

/** Shown on the /shipping page and each product page while EU shipping is off. */
export const EU_PAUSE_NOTICE =
  'Due to new EU product safety rules, we have paused shipping to the European Union, Norway, Iceland and Liechtenstein. We hope to resume soon.';

/** Where we ship, in one sentence, for anyone outside it or choosing a country. */
export const SHIPPING_REACH =
  'We ship worldwide, except to the European Union, Norway, Iceland, Liechtenstein, Russia and Belarus.';

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

/** "a UK address", "an address in Canada": for "Is this going to …?". */
export function addressIn(code: ShipCountry): string {
  if (code === 'GB') return 'a UK address';
  if (code === 'US') return 'a US address';
  return `an address in ${countryInSentence(code)}`;
}

/**
 * Where shipping is paused for EU product-safety rules (the EU, its outermost
 * regions, and the EEA states Norway, Iceland and Liechtenstein, with
 * Svalbard), for the pause notice. ISO 3166-1 alpha-2.
 */
const PAUSED_COUNTRY_CODES = new Set(
  'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE AX GF GP MQ RE YT MF NO IS LI SJ'.split(
    ' '
  )
);

/** A visitor located (by IP) somewhere we don't ship to. */
export interface VisitorOutside {
  code: string;
  /** "France" */
  name: string;
  /** Shipping there is paused for EU product-safety rules (rather than never offered). */
  paused: boolean;
}

/**
 * The visitor's country from Vercel's `x-vercel-ip-country`, when it's one we
 * don't ship to; null when we do, or when it's unknown (local dev). The cart
 * and checkout use it to warn before payment: a buyer in France once paid
 * for UK delivery with a French address.
 */
export function visitorOutside(code: string | null | undefined): VisitorOutside | null {
  if (!code || !/^[A-Z]{2}$/.test(code) || isShipCountry(code)) return null;
  let name = code;
  try {
    name = new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(code) ?? code;
  } catch {
    // An unknown code: the code itself will do.
  }
  return { code, name, paused: PAUSED_COUNTRY_CODES.has(code) };
}

/** "the United Kingdom", "Canada", "the Bahamas": a country name to use in a sentence. */
export function countryInSentence(code: ShipCountry): string {
  const name = countryName(code);
  return /^(United |Bahamas|Gambia|Philippines|Maldives|Comoros|Seychelles|Caribbean)|Islands|Territory|Emirates|Republic/.test(
    name
  )
    ? `the ${name}`
    : name;
}

/**
 * Postcode shapes for the European countries we ship to (upper-cased,
 * single-spaced); elsewhere postcodes aren't checked.
 * Stripe's address form takes any postcode under any country, and its
 * embedded checkout no longer lets us reject an address before payment, so
 * the webhook checks the shape after payment and flags a mismatch for the
 * studio to sort out before posting. The risk is a buyer in the EU, where we
 * don't ship, choosing a European country we do ship to: one in France once
 * paid for UK delivery with "94410" as the postcode.
 *
 * Where a neighbour shares a format (Swiss and Belgian postcodes are both four
 * digits) a mismatch can't be seen; Monaco, San Marino and the Vatican use
 * their own ranges inside France's and Italy's, so those are pinned exactly.
 */
const POSTCODE_PATTERNS: Partial<Record<ShipCountry, RegExp>> = {
  GB: /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|BFPO ?\d{1,4})$/,
  JE: /^JE\d{1,2} ?\d[A-Z]{2}$/,
  GG: /^GY\d{1,2} ?\d[A-Z]{2}$/,
  IM: /^IM\d{1,2} ?\d[A-Z]{2}$/,
  GI: /^GX11 ?1AA$/,
  CH: /^[1-9]\d{3}$/,
  MC: /^980\d{2}$/,
  AD: /^AD ?\d{3}$/,
  SM: /^4789\d$/,
  VA: /^00120$/,
  FO: /^(FO-?)?\d{3}$/,
  UA: /^\d{5}$/,
  MD: /^(MD-?)?\d{4}$/,
  RS: /^\d{5}$/,
  ME: /^8\d{4}$/,
  BA: /^\d{5}$/,
  XK: /^\d{5}$/,
  MK: /^\d{4}$/,
  AL: /^\d{4}$/,
  TR: /^\d{5}$/,
};

/**
 * Why a shipping address needs checking before it's posted, or null if it
 * looks right: a country we don't ship to, or a postcode that isn't shaped
 * like one from the country chosen. Names no part of the address, so it can
 * sit on the (public) order document.
 */
export function addressWarning(
  country: string | null | undefined,
  postcode: string | null | undefined
): string | null {
  if (!isShipCountry(country)) {
    return `The shipping country (${country || 'none'}) isn’t one we ship to. Check the address in Stripe before posting.`;
  }
  const normalised = (postcode ?? '')
    .normalize('NFKC') // full-width digits and hyphens
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const pattern = POSTCODE_PATTERNS[country];
  if (!pattern || pattern.test(normalised)) return null;
  return `The postcode doesn’t look like one from ${countryInSentence(country)}, the country chosen at checkout. Check the address with the customer before posting.`;
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
