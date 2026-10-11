/**
 * Made-to-order pieces — the single source for their wording and limits.
 *
 * A variant switched to "Made to order" in the Studio is sold regardless of
 * stock (it is never stock-tracked), and the customer types their own size.
 * Made-to-order rings can also carry a paid engraving and free-text notes.
 * The PDP, cart, checkout API, Stripe and both order emails all read from here.
 */

import { formatPence } from './shipping';

export const MADE_TO_ORDER_LEAD_TIME = '8–12 weeks';

/** Longest custom size a customer can enter, e.g. "UK N (US 6¾)" or "17.5mm". */
export const CUSTOM_SIZE_MAX = 20;

/** Engraving on a made-to-order ring: price per piece (pence) and length. */
export const ENGRAVING_PRICE_PENCE = 3000;
export const ENGRAVING_MAX = 10;

/**
 * What can be engraved: letters (accented too), digits, spaces and a few
 * marks. The PDP strips anything else as it's typed; the checkout API rejects
 * it outright.
 */
export const ENGRAVING_PATTERN = /^[\p{L}\p{N} &.,'\-:/+♥]*$/u;

/** Remove characters that can't be engraved (the PDP's live filter). */
export const engravable = (text: string) =>
  [...text].filter((ch) => ENGRAVING_PATTERN.test(ch)).join('');

/** Notes on a made-to-order ring: changes already agreed with the studio. */
export const NOTES_MAX = 200;
export const NOTES_HINT =
  'Only for changes we’ve already agreed with you by email or Instagram. Anything new, please message us before ordering.';

/**
 * "Made to order · Size UK Y · Larger size +£75 · Engraving “J&M” · ships in
 * 8–12 weeks" — one line, every surface.
 */
export function madeToOrderNote(
  customSize?: string | null,
  engraving?: string | null,
  largeSizeGBP?: number | null
): string {
  return [
    'Made to order',
    customSize ? `Size ${customSize}` : null,
    largeSizeGBP ? `Larger size +${formatPence(largeSizeGBP)}` : null,
    engraving ? `Engraving “${engraving}”` : null,
    `ships in ${MADE_TO_ORDER_LEAD_TIME}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
