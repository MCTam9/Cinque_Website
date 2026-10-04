/**
 * Ring sizes — the single source for the size chart and the PDP size picker.
 *
 * We make UK full sizes G to T. Every other system is just another name for
 * one of those sizes, so the picker offers exactly the chart's rows and
 * switching system relabels the same row. The chart is computed from each
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

const UK_LETTERS = 'GHIJKLMNOPQRST'.split('');

/** UK ring sizes G–T with US / EU / JP equivalents, inner circumference and diameter (mm). */
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
