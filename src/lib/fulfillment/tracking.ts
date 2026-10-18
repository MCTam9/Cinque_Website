/**
 * Couriers and their tracking pages. Shared by the Studio (the order's carrier
 * dropdown and the Orders table) and the shipping-confirmation email, so it
 * must stay free of server-only imports.
 *
 * Links go to the courier's own tracking page rather than an aggregator: the
 * customer lands somewhere they recognise and no third party sees the number.
 */

export const CARRIERS: { title: string; value: string }[] = [
  { title: 'Royal Mail', value: 'royal-mail' },
  { title: 'DHL Express', value: 'dhl-express' },
  { title: 'FedEx', value: 'fedex' },
  { title: 'UPS', value: 'ups' },
  { title: 'Other', value: 'other' },
];

// `n` arrives already URL-encoded. 'other' has no template, so no link.
const TRACKING_URLS: Partial<Record<string, (n: string) => string>> = {
  'royal-mail': (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}`,
  'dhl-express': (n) =>
    `https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`,
  fedex: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  ups: (n) => `https://www.ups.com/track?tracknum=${n}`,
};

// Before the dropdown the carrier was free text ("Royal Mail", "DHL", "fedex").
// Matched with case, spaces and punctuation ignored.
const LEGACY_ALIASES: Record<string, string> = {
  royalmail: 'royal-mail',
  dhl: 'dhl-express',
  dhlexpress: 'dhl-express',
  fedex: 'fedex',
  ups: 'ups',
};

/** A list value from `CARRIERS`, or null for empty / unrecognised text. */
function normaliseCarrier(carrier?: string | null): string | null {
  const lower = carrier?.trim().toLowerCase();
  if (!lower) return null;
  if (CARRIERS.some((c) => c.value === lower)) return lower;
  return LEGACY_ALIASES[lower.replace(/[^a-z]/g, '')] ?? null;
}

/** Display name: a known carrier's title, otherwise the raw text; '' when unset. */
export function carrierLabel(carrier?: string | null): string {
  const value = normaliseCarrier(carrier);
  if (value) return CARRIERS.find((c) => c.value === value)?.title ?? '';
  return carrier?.trim() ?? '';
}

/** The courier's tracking page for this parcel, or null ('other', unknown, or no number). */
export function trackingUrl(
  carrier?: string | null,
  trackingNumber?: string | null
): string | null {
  const build = TRACKING_URLS[normaliseCarrier(carrier) ?? ''];
  // Numbers are often pasted with spaces ("AB 1234 5678 GB").
  const number = trackingNumber?.replace(/\s+/g, '');
  return build && number ? build(encodeURIComponent(number)) : null;
}
