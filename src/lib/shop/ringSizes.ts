/**
 * Ring sizes — the single source for the size chart and the PDP size picker.
 *
 * We make UK full sizes G to T as standard. A product can also offer larger
 * sizes, U up to Z, at a surcharge (both set per product in the Admin). Every
 * other system is just another name for one of those sizes, so the picker
 * offers exactly the chart's rows and switching system relabels the same row. The chart is computed from each
 * system's definition by inner circumference (mm) rather than typed in, and
 * agrees with Cartier's published chart to within its whole-millimetre
 * rounding.
 *
 *   UK: A = 37.5 mm, +1.25 mm per letter.
 *   US: diameter = 11.63 + 0.8128 × size, i.e. 36.54 + 2.553 × size round.
 *   EU: the circumference in mm.
 *   JP: circumference − 40 (1 mm per size).
 */

const ukCirc = (letter: string) => 37.5 + 1.25 * (letter.charCodeAt(0) - 65);

/** "6", "6¼", "6½", "6¾" — `n` rounded to the nearest quarter. */
function quarter(n: number): string {
  const r = Math.round(n * 4) / 4;
  const whole = Math.floor(r);
  return `${whole}${{ 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[r - whole]}`;
}

const UK_LETTERS = 'GHIJKLMNOPQRSTUVWXYZ'.split('');

/** The largest size we make as standard; anything above is a larger size. */
export const STANDARD_MAX = 'T';

/** The larger sizes a product can offer, U–Z. */
export const LARGE_SIZE_LETTERS = UK_LETTERS.slice(UK_LETTERS.indexOf(STANDARD_MAX) + 1);

/** UK ring sizes G–Z with US / EU / JP equivalents, inner circumference and diameter (mm). */
export const RING_SIZE_ROWS = UK_LETTERS.map((uk) => {
  const circ = ukCirc(uk);
  return {
    uk,
    us: quarter((circ - 36.54) / 2.553),
    eu: `${Math.round(circ)}`,
    jp: `${Math.round(circ - 40)}`,
    circ: circ.toFixed(1),
    dia: (circ / Math.PI).toFixed(1),
  };
});

export const RING_SIZE_SYSTEMS = ['UK', 'US', 'EU', 'JP'] as const;
export type RingSizeSystem = (typeof RING_SIZE_SYSTEMS)[number];

const COLUMN = { UK: 'uk', US: 'us', EU: 'eu', JP: 'jp' } as const;

/**
 * Size `row` of the chart as written in `system`, e.g. ("US", N) → "6¾".
 * The picker offers exactly the chart's rows, so the two can never disagree.
 */
export function ringSizeLabel(system: RingSizeSystem, row: number): string {
  return RING_SIZE_ROWS[row][COLUMN[system]];
}

/**
 * What the order, cart and emails record: the UK size the workshop makes,
 * plus the buyer's own system when they chose another — "UK N", or
 * "UK N (US 6¾)".
 */
export function formatRingSize(system: RingSizeSystem, row: number): string {
  const uk = `UK ${RING_SIZE_ROWS[row].uk}`;
  return system === 'UK' ? uk : `${uk} (${system} ${ringSizeLabel(system, row)})`;
}

/** A variant's larger sizes: the largest it offers and the surcharge (pence). */
export interface LargeSizes {
  upTo: string;
  surchargeGBP: number;
}

/** How many chart rows a product offers: G–T, or G up to its largest size. */
export function ringRowCount(large?: LargeSizes | null): number {
  const last = large && LARGE_SIZE_LETTERS.includes(large.upTo) ? large.upTo : STANDARD_MAX;
  return UK_LETTERS.indexOf(last) + 1;
}

/** Whether chart row `row` is a larger size (above UK T). */
export const isLargeRow = (row: number) => row > UK_LETTERS.indexOf(STANDARD_MAX);

/** "UK Y (US 12¼)" → "Y"; null for a size the picker didn't write. */
export function ukLetterOf(size: string): string | null {
  return /^UK ([A-Z])(?![A-Za-z])/.exec(size.trim())?.[1] ?? null;
}

/**
 * Check a made-to-order ring size against what the product offers, and what
 * it adds to the price. The PDP shows this and the checkout API charges it,
 * so a buyer can't pick (or post) a size the workshop hasn't priced.
 *
 * A size not in the picker's "UK X" form passes only where the product offers
 * no larger sizes (a cart saved before the picker); otherwise its surcharge
 * couldn't be worked out.
 */
export function ringSizeCharge(
  size: string,
  large?: LargeSizes | null
): { ok: boolean; surchargeGBP: number } {
  const letter = ukLetterOf(size);
  if (!letter) return { ok: !large, surchargeGBP: 0 };
  const row = UK_LETTERS.indexOf(letter);
  if (row < 0 || row >= ringRowCount(large)) return { ok: false, surchargeGBP: 0 };
  return { ok: true, surchargeGBP: isLargeRow(row) ? (large?.surchargeGBP ?? 0) : 0 };
}

/** Larger sizes are an option on made-to-order rings in anything but silver. */
export const offersLargeSizes = (
  category?: string | null,
  v?: { metalType?: string | null; madeToOrder?: boolean | null } | null
) => category === 'rings' && Boolean(v?.madeToOrder) && v?.metalType !== 'sterling_silver';

/**
 * The PDP chart's larger sizes across a product's variants: up to the largest
 * any offers, with the surcharge only when they all charge the same (it's
 * shown with each choice above otherwise).
 */
export function chartLargeSizes(list: (LargeSizes | null | undefined)[]): LargeSizes | null {
  const offered = list.filter((l): l is LargeSizes => Boolean(l));
  if (!offered.length) return null;
  const upTo = offered
    .map((l) => l.upTo)
    .sort()
    .at(-1)!;
  const charges = new Set(offered.map((l) => l.surchargeGBP));
  return { upTo, surchargeGBP: charges.size === 1 ? offered[0].surchargeGBP : 0 };
}

/**
 * A ring variant's larger sizes from its Admin fields, or null when it offers
 * none. Each variant has its own, so 14ct can charge more for the extra gold
 * than 9ct. Shared by the PDP, the checkout API and the cart reminder so they
 * always agree.
 */
export function largeSizesOf(
  category: string | null | undefined,
  v?: {
    metalType?: string | null;
    madeToOrder?: boolean | null;
    largeSizesUpTo?: string | null;
    largeSizeSurchargeGBP?: number | null;
  } | null
): LargeSizes | null {
  if (!offersLargeSizes(category, v) || !v?.largeSizesUpTo) return null;
  if (!LARGE_SIZE_LETTERS.includes(v.largeSizesUpTo)) return null;
  return { upTo: v.largeSizesUpTo, surchargeGBP: Math.max(0, v.largeSizeSurchargeGBP ?? 0) };
}
