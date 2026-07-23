'use client';

import { useState } from 'react';

/** UK → US/EU ring-size reference (common subset). Static reference data. */
const ROWS = [
  { uk: 'J', us: '4¾', eu: '48.7', mm: '15.5' },
  { uk: 'K', us: '5¼', eu: '49.9', mm: '15.9' },
  { uk: 'L', us: '5¾', eu: '51.2', mm: '16.3' },
  { uk: 'M', us: '6¼', eu: '52.5', mm: '16.7' },
  { uk: 'N', us: '6¾', eu: '53.8', mm: '17.1' },
  { uk: 'O', us: '7¼', eu: '55.1', mm: '17.5' },
  { uk: 'P', us: '7¾', eu: '56.3', mm: '17.9' },
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
        <div className="mt-5 overflow-x-auto">
          <table className="w-full type-p2 text-left">
            <thead className="text-oslo">
              <tr>
                <th className="py-1 pr-4 font-normal">UK</th>
                <th className="py-1 pr-4 font-normal">US</th>
                <th className="py-1 pr-4 font-normal">EU</th>
                <th className="py-1 font-normal">Ø mm</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.uk} className="border-t border-oslo/30">
                  <td className="py-1 pr-4">{r.uk}</td>
                  <td className="py-1 pr-4">{r.us}</td>
                  <td className="py-1 pr-4">{r.eu}</td>
                  <td className="py-1">{r.mm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
