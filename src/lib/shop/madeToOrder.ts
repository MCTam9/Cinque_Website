/**
 * Made-to-order pieces — the single source for their wording and limits.
 *
 * A variant switched to "Made to order" in the Studio is sold regardless of
 * stock (it is never stock-tracked), and the customer types their own size.
 * The PDP, cart, Stripe checkout and both order emails all read from here.
 */

export const MADE_TO_ORDER_LEAD_TIME = '8–12 weeks';

/** Longest custom size a customer can enter, e.g. "N½" or "17.5mm". */
export const CUSTOM_SIZE_MAX = 20;

/** "Made to order · Size N½ · ships in 8–12 weeks" — one line, every surface. */
export function madeToOrderNote(customSize?: string | null): string {
  return [
    'Made to order',
    customSize ? `Size ${customSize}` : null,
    `ships in ${MADE_TO_ORDER_LEAD_TIME}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
