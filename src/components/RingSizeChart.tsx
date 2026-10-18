'use client';

import { useEffect, useState } from 'react';
import {
  RING_SIZE_ROWS,
  STANDARD_MAX,
  isLargeRow,
  ringRowCount,
  type LargeSizes,
} from '@/lib/shop/ringSizes';
import { formatPence } from '@/lib/shop/shipping';

/** Anchor the PDP's "Ring size chart" link (made-to-order size field) jumps to. */
export const RING_SIZE_CHART_ID = 'ring-size-chart';

/**
 * Collapsible ring-size chart. Opens itself when linked to by id.
 * On the PDP: G–T, plus a product's larger sizes (and their surcharge) when it
 * has them. `showAll` (shop and rings pages): every size G–Z, with a note that
 * the larger ones are on selected gold rings, priced on the product page.
 */
export default function RingSizeChart({
  largeSizes,
  showAll = false,
}: {
  largeSizes?: LargeSizes | null;
  showAll?: boolean;
}) {
  const rows = showAll ? RING_SIZE_ROWS : RING_SIZE_ROWS.slice(0, ringRowCount(largeSizes));
  const firstLarge = rows.find((_, i) => isLargeRow(i))?.uk;
  const lastSize = rows[rows.length - 1].uk;
  const surcharge = largeSizes?.surchargeGBP ?? 0;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash === `#${RING_SIZE_CHART_ID}`) setOpen(true);
    };
    openIfTargeted();
    window.addEventListener('hashchange', openIfTargeted);
    return () => window.removeEventListener('hashchange', openIfTargeted);
  }, []);

  return (
    <div id={RING_SIZE_CHART_ID} className="scroll-mt-[20px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="type-h3 flex w-full items-center justify-between border-b border-oslo pb-[10px] text-left"
      >
        <span>Ring size chart</span>
        <span className="text-oslo">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-[10px] overflow-x-auto">
          <table className="type-p1 text-left">
            <thead className="text-oslo">
              <tr>
                <th className="py-[10px] pr-8 md:pr-6 font-normal">UK</th>
                <th className="py-[10px] pr-8 md:pr-6 font-normal">US</th>
                <th className="py-[10px] pr-8 md:pr-6 font-normal">EU</th>
                <th className="py-[10px] pr-8 md:pr-6 font-normal">JP</th>
                <th className="py-[10px] pr-8 md:pr-6 font-normal">Circumference (mm)</th>
                <th className="py-[10px] font-normal">Diameter (mm)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.uk}
                  // The first larger size starts under a full rule, like a new section.
                  className={`border-t ${r.uk === firstLarge ? 'border-graphite' : 'border-oslo/30'}`}
                >
                  <td className="py-[10px] pr-8 md:pr-6">{r.uk}</td>
                  <td className="py-[10px] pr-8 md:pr-6">{r.us}</td>
                  <td className="py-[10px] pr-8 md:pr-6">{r.eu}</td>
                  <td className="py-[10px] pr-8 md:pr-6">{r.jp}</td>
                  <td className="py-[10px] pr-8 md:pr-6">{r.circ}</td>
                  <td className="py-[10px]">{r.dia}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {firstLarge && (showAll || largeSizes) && (
            <p className="type-p2 mt-[10px] text-oslo">
              {showAll
                ? `Sizes ${firstLarge}–${lastSize} are available on selected gold rings; any surcharge is shown on the product page.`
                : `Sizes ${firstLarge}–${lastSize} are larger than our standard G–${STANDARD_MAX}${
                    surcharge ? ` and add ${formatPence(surcharge)} for the extra metal` : ''
                  }.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
