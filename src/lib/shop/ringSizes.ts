/**
 * Ring sizes — the single source for the size chart and the PDP size picker.
 *
 * Every system is tied back to inner circumference (mm), which is what the
 * workshop actually makes to, so switching system in the picker can land on
 * the nearest equivalent size.
 */

/** UK ring sizes with US / EU / JP equivalents (JP to the nearest whole size), inner circumference and diameter (mm). */
export const RING_SIZE_ROWS = [
  { uk: 'G', us: '3¼', eu: '44', jp: '4', circ: '44.3', dia: '14.1' },
  { uk: 'H', us: '3¾', eu: '45.5', jp: '6', circ: '45.6', dia: '14.5' },
  { uk: 'I', us: '4¼', eu: '46.5', jp: '7', circ: '46.8', dia: '14.9' },
  { uk: 'J', us: '4¾', eu: '48', jp: '8', circ: '48.1', dia: '15.3' },
  { uk: 'K', us: '5¼', eu: '49.5', jp: '9', circ: '49.3', dia: '15.7' },
  { uk: 'L', us: '5¾', eu: '50.5', jp: '10', circ: '50.6', dia: '16.1' },
  { uk: 'M', us: '6¼', eu: '52', jp: '12', circ: '51.9', dia: '16.5' },
  { uk: 'N', us: '6¾', eu: '53', jp: '13', circ: '53.1', dia: '16.9' },
  { uk: 'O', us: '7¼', eu: '54.5', jp: '14', circ: '54.4', dia: '17.3' },
  { uk: 'P', us: '7¾', eu: '55.5', jp: '15', circ: '55.7', dia: '17.7' },
  { uk: 'Q', us: '8¼', eu: '57', jp: '16', circ: '56.9', dia: '18.1' },
  { uk: 'R', us: '8¾', eu: '58.5', jp: '17', circ: '58.1', dia: '18.5' },
  { uk: 'S', us: '9¼', eu: '59.5', jp: '19', circ: '59.4', dia: '18.9' },
  { uk: 'T', us: '9¾', eu: '61', jp: '20', circ: '60.9', dia: '19.4' },
] as const;

export const RING_SIZE_SYSTEMS = ['UK', 'US', 'EU', 'JP'] as const;
export type RingSizeSystem = (typeof RING_SIZE_SYSTEMS)[number];

export interface RingSizeOption {
  label: string;
  /** Inner circumference, mm. */
  circ: number;
}

const half = (n: number) => (Number.isInteger(n) ? `${n}` : `${Math.floor(n)}½`);

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to + 1e-9; n += step) out.push(Math.round(n * 2) / 2);
  return out;
}

/** UK letters G–T with half sizes; halves sit midway between the letters. */
const UK: RingSizeOption[] = RING_SIZE_ROWS.flatMap((row, i) => {
  const circ = Number(row.circ);
  const next = RING_SIZE_ROWS[i + 1];
  return next
    ? [{ label: row.uk, circ }, { label: `${row.uk}½`, circ: (circ + Number(next.circ)) / 2 }]
    : [{ label: row.uk, circ }];
});

/**
 * The selectable sizes per system, all spanning the same range as the chart.
 * US: diameter = 11.63 + 0.8128 × size. EU: the circumference itself.
 * JP: diameter = 13 + (size − 1) / 3.
 */
export const RING_SIZE_OPTIONS: Record<RingSizeSystem, RingSizeOption[]> = {
  UK,
  US: range(3, 10, 0.5).map((n) => ({ label: half(n), circ: Math.PI * (11.63 + 0.8128 * n) })),
  EU: range(44, 61, 1).map((n) => ({ label: `${n}`, circ: n })),
  JP: range(4, 20, 1).map((n) => ({ label: `${n}`, circ: Math.PI * (13 + (n - 1) / 3) })),
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
