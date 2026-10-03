/**
 * Ring sizes — the single source for the size chart and the PDP size picker.
 *
 * Every system is defined by inner circumference (mm), which is what the
 * workshop actually makes to, so the chart is computed rather than typed in
 * and switching system in the picker lands on the nearest equivalent size.
 * Checked against Cartier's published chart: every size agrees to within the
 * rounding of its whole-millimetre rows.
 *
 *   UK: A = 37.5 mm, +1.25 mm per letter (+0.625 per half).
 *   US: diameter = 11.63 + 0.8128 × size, i.e. 36.54 + 2.553 × size round.
 *   EU: the circumference in mm.
 *   JP: circumference − 40 (1 mm per size).
 */

const ukCirc = (letter: string) => 37.5 + 1.25 * (letter.charCodeAt(0) - 65);
const usCirc = (size: number) => 36.54 + 2.553 * size;
const jpCirc = (size: number) => 40 + size;

/** "6", "6¼", "6½", "6¾" — `n` rounded to the nearest step of `step`. */
function fraction(n: number, step: 0.25 | 0.5): string {
  const r = Math.round(n / step) * step;
  const whole = Math.floor(r);
  return `${whole}${{ 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[r - whole]}`;
}

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to + 1e-9; n += step) out.push(Math.round(n / step) * step);
  return out;
}

const UK_LETTERS = 'GHIJKLMNOPQRSTUVWXYZ'.split('');

/** UK ring sizes G–Z with US / EU / JP equivalents, inner circumference and diameter (mm). */
export const RING_SIZE_ROWS = UK_LETTERS.map((uk) => {
  const circ = ukCirc(uk);
  return {
    uk,
    us: fraction((circ - 36.54) / 2.553, 0.25),
    eu: `${Math.round(circ)}`,
    jp: `${Math.round(circ - 40)}`,
    circ: circ.toFixed(1),
    dia: (circ / Math.PI).toFixed(1),
  };
});

export const RING_SIZE_SYSTEMS = ['UK', 'US', 'EU', 'JP'] as const;
export type RingSizeSystem = (typeof RING_SIZE_SYSTEMS)[number];

export interface RingSizeOption {
  label: string;
  /** Inner circumference, mm. */
  circ: number;
}

/** The selectable sizes per system, all spanning UK G to Z. */
export const RING_SIZE_OPTIONS: Record<RingSizeSystem, RingSizeOption[]> = {
  UK: UK_LETTERS.flatMap((l, i) =>
    i < UK_LETTERS.length - 1
      ? [
          { label: l, circ: ukCirc(l) },
          { label: `${l}½`, circ: ukCirc(l) + 0.625 },
        ]
      : [{ label: l, circ: ukCirc(l) }]
  ),
  US: range(3, 12.5, 0.5).map((n) => ({ label: fraction(n, 0.5), circ: usCirc(n) })),
  EU: range(45, 69, 1).map((n) => ({ label: `${n}`, circ: n })),
  JP: range(5, 29, 1).map((n) => ({ label: `${n}`, circ: jpCirc(n) })),
};

/** Index of the size in `system` closest to circumference `circ`. */
export function nearestRingSize(system: RingSizeSystem, circ: number): number {
  const options = RING_SIZE_OPTIONS[system];
  let best = 0;
  options.forEach((o, i) => {
    if (Math.abs(o.circ - circ) < Math.abs(options[best].circ - circ)) best = i;
  });
  return best;
}

/** "UK N½" — what the order, cart and emails record as the custom size. */
export function formatRingSize(system: RingSizeSystem, label: string): string {
  return `${system} ${label}`;
}
