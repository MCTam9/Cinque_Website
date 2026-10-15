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
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
] as const;

export type ShipCountry = (typeof SHIP_COUNTRIES)[number]['code'];

export const SHIP_COUNTRY_CODES = SHIP_COUNTRIES.map((c) => c.code) as [
  ShipCountry,
  ...ShipCountry[],
];

export const HOME_COUNTRY: ShipCountry = 'GB';

/**
 * Who pays import duties and taxes, per destination. Every country must be
 * listed, so adding one to SHIP_COUNTRIES forces a decision here.
 *
 * 'included': we prepay them (Royal Mail PDDP or equivalent), so the buyer has
 * nothing to pay on delivery. 'buyer': the destination collects them from the
 * recipient on delivery (DAP). 'none': domestic, no customs.
 *
 * Since October 2026 every international destination is 'buyer': the site
 * states that import duties, taxes and carrier handling fees are not included.
 * Deliberately the cautious claim — if the studio later prepays some (e.g.
 * Royal Mail PDDP to the US), switch that country to 'included'.
 */
export const IMPORT_CHARGES: Record<ShipCountry, 'none' | 'included' | 'buyer'> = {
  GB: 'none',
  US: 'buyer',
  CA: 'buyer',
  AU: 'buyer',
  JP: 'buyer',
};

/**
 * Each destination's customs authority and its own guidance on what a buyer
 * pays on goods ordered from abroad — linked wherever the duties notice shows,
 * so the buyer can check the rules with the people who set them.
 */
export const IMPORT_AUTHORITY: Record<ShipCountry, { name: string; url: string } | null> = {
  GB: null,
  US: {
    name: 'U.S. Customs and Border Protection',
    url: 'https://www.cbp.gov/trade/basic-import-export/internet-purchases',
  },
  CA: {
    name: 'the Canada Border Services Agency',
    url: 'https://www.cbsa-asfc.gc.ca/import/postal-postale/menu-eng.html',
  },
  AU: {
    name: 'the Australian Border Force',
    url: 'https://www.abf.gov.au/buying-online',
  },
  JP: {
    name: 'Japan Customs',
    url: 'https://www.customs.go.jp/english/c-answer_e/kokusaiyubin/6101_e.htm',
  },
};

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
  const charges = IMPORT_CHARGES[country];
  if (charges === 'none') return null;
  if (charges === 'included') {
    return 'Import duties and taxes are included. There is nothing more to pay on delivery.';
  }
  const authority = IMPORT_AUTHORITY[country]?.name ?? 'the destination’s customs authority';
  return `Import duties, taxes and any carrier handling fees are not included in your order total. They are set by ${authority} and are payable by you before or on delivery.`;
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
  'Due to recent changes to EU import rules, we have paused shipping to the European Union. We hope to resume soon.';

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

/** "the United Kingdom", "Canada": a country name to use in a sentence. */
export function countryInSentence(code: ShipCountry): string {
  return code === 'GB' || code === 'US' ? `the ${countryName(code)}` : countryName(code);
}

/** "the United Kingdom, the United States, Canada, Australia and Japan". */
export const SHIP_COUNTRIES_SENTENCE = SHIP_COUNTRY_CODES.map(countryInSentence)
  .join(', ')
  .replace(/, ([^,]+)$/, ' and $1');

/**
 * Postcode shapes for the countries we ship to (upper-cased, single-spaced).
 * Stripe's address form takes any postcode under any country, and its
 * embedded checkout no longer lets us reject an address before payment, so
 * the webhook checks the shape after payment and flags a mismatch for the
 * studio to sort out before posting. A buyer in France once paid for UK
 * delivery with "94410" as the postcode.
 */
const POSTCODE_PATTERNS: Record<ShipCountry, RegExp> = {
  GB: /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|BFPO ?\d{1,4})$/,
  US: /^\d{5}(-?\d{4})?$/,
  CA: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/,
  AU: /^\d{4}$/,
  JP: /^\d{3}-?\d{4}$/,
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
    .normalize('NFKC') // full-width digits and hyphens, as typed in Japan
    .replace(/^〒/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
  if (POSTCODE_PATTERNS[country].test(normalised)) return null;
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
