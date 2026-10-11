/**
 * Made-to-order pieces — the single source for their wording and limits.
 *
 * A variant switched to "Made to order" in the Studio is sold regardless of
 * stock (it is never stock-tracked), and the customer types their own size.
 * Made-to-order rings can also carry a paid engraving and free-text notes.
 * The PDP, cart, checkout API, Stripe and both order emails all read from here.
 */

export const MADE_TO_ORDER_LEAD_TIME = '8–12 weeks';

/** The PDP and cart line for a made-to-order piece. */
export const MADE_TO_ORDER_LINE = `Made to order, ships in ${MADE_TO_ORDER_LEAD_TIME}`;

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

/** A cart or order line, as far as its price breakdown needs. */
export interface PricedLine {
  /** The piece itself, per piece (pence). */
  unitPriceGBP: number;
  quantity: number;
  largeSizeGBP?: number | null;
  engraving?: string | null;
  engravingGBP?: number | null;
}

/** A line's total: the piece plus any larger size and engraving, times quantity (pence). */
export const lineTotalGBP = (l: PricedLine) =>
  (l.unitPriceGBP + (l.largeSizeGBP ?? 0) + (l.engravingGBP ?? 0)) * l.quantity;

/**
 * What a made-to-order ring's price is made of, one row each, for a line with
 * a paid extra: the ring, then its larger size and engraving. Amounts cover
 * the line's quantity, so the rows add up to the line total under them. Null
 * when there's nothing to break down. The cart and both order emails show it.
 */
export function priceRows(l: PricedLine): { label: string; amount: number }[] | null {
  const extras = [
    l.largeSizeGBP ? { label: 'Larger size', amount: l.largeSizeGBP } : null,
    l.engraving ? { label: `Engraving “${l.engraving}”`, amount: l.engravingGBP ?? 0 } : null,
  ].filter((r): r is { label: string; amount: number } => r !== null);
  if (extras.length === 0) return null;
  const times = l.quantity > 1 ? ` × ${l.quantity}` : '';
  return [{ label: 'Ring', amount: l.unitPriceGBP }, ...extras].map((r) => ({
    label: `${r.label}${times}`,
    amount: r.amount * l.quantity,
  }));
}
