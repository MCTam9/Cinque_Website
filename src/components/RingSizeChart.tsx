'use client';

import { useState } from 'react';

/** UK ring sizes with US equivalent, inner circumference and diameter (mm). */
const ROWS = [
  { uk: 'G', us: '3.25', circ: '44.3', dia: '14.1' },
  { uk: 'H', us: '3.75', circ: '45.6', dia: '14.5' },
  { uk: 'I', us: '4.25', circ: '46.8', dia: '14.9' },
  { uk: 'J', us: '4.75', circ: '48.1', dia: '15.3' },
  { uk: 'K', us: '5.25', circ: '49.3', dia: '15.7' },
  { uk: 'L', us: '5.75', circ: '50.6', dia: '16.1' },
  { uk: 'M', us: '6.25', circ: '51.9', dia: '16.5' },
  { uk: 'N', us: '6.75', circ: '53.1', dia: '16.9' },
  { uk: 'O', us: '7.25', circ: '54.4', dia: '17.3' },
  { uk: 'P', us: '7.75', circ: '55.7', dia: '17.7' },
  { uk: 'Q', us: '8.25', circ: '56.9', dia: '18.1' },
  { uk: 'R', us: '8.75', circ: '58.1', dia: '18.5' },
  { uk: 'S', us: '9.25', circ: '59.4', dia: '18.9' },
  { uk: 'T', us: '9.75', circ: '60.9', dia: '19.4' },
] as const;

/** Collapsible ring-size chart for the PDP. */
export default function RingSizeChart() {
  const [open, setOpen] = useState(false);

  return (
    <div>
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
          <table className="w-full type-p1 text-left">
            <thead className="text-oslo">
              <tr>
                <th className="py-[10px] pr-4 font-normal">UK</th>
                <th className="py-[10px] pr-4 font-normal">US</th>
                <th className="py-[10px] pr-4 font-normal">Circumference (mm)</th>
                <th className="py-[10px] font-normal">Diameter Ø (mm)</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.uk} className="border-t border-oslo/30">
                  <td className="py-[10px] pr-4">{r.uk}</td>
                  <td className="py-[10px] pr-4">{r.us}</td>
                  <td className="py-[10px] pr-4">{r.circ}</td>
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
