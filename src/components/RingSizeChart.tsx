'use client';

import { useEffect, useState } from 'react';
import { RING_SIZE_ROWS } from '@/lib/shop/ringSizes';

/** Anchor the PDP's "Ring size chart" link (made-to-order size field) jumps to. */
export const RING_SIZE_CHART_ID = 'ring-size-chart';

/** Collapsible ring-size chart for the PDP. Opens itself when linked to by id. */
export default function RingSizeChart() {
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
              {RING_SIZE_ROWS.map((r) => (
                <tr key={r.uk} className="border-t border-oslo/30">
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
        </div>
      )}
    </div>
  );
}
