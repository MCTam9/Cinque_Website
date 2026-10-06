'use client';

import { useId, useState } from 'react';

/**
 * An expandable section on the PDP (Shipping & Returns, After Care): a
 * full-width header button with + / − on the right, and a body that opens and
 * closes with the shared `.dropdown-panel` motion. The body stays mounted, so
 * its copy is in the page for search engines and for find-in-page even while
 * collapsed (`visibility: hidden` still keeps it out of the tab order).
 *
 * As with the other `.dropdown-panel`s, the clipping child stays bare; the
 * spacing above the body is padding on the content inside it.
 */
export default function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-t border-oslo/60 pt-[10px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="type-p1 flex w-full items-center justify-between font-bold text-graphite hover:text-redcurrent"
      >
        <span>{title}</span>
        <span aria-hidden className="font-normal text-oslo">
          {open ? '−' : '+'}
        </span>
      </button>
      <div id={panelId} data-open={open} className="dropdown-panel">
        <div>
          <div className="type-p1 flex flex-col gap-[10px] pt-[10px] text-graphite">{children}</div>
        </div>
      </div>
    </div>
  );
}
