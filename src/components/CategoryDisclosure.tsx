'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mobile CATEGORY dropdown. Replaces a native <details> so the panel is
 * conditionally mounted on open — that's what lets the shared `.animate-dropdown`
 * reveal fire each time (a <details> keeps its panel in the DOM, so the CSS
 * animation never re-triggers). Closes on outside click, Escape, or selection.
 */
export default function CategoryDisclosure({
  label = 'CATEGORY',
  className = '',
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="type-h3 cursor-pointer"
      >
        {label}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="animate-dropdown absolute right-0 top-full z-20 mt-[10px] border border-oslo bg-cararra px-[20px] py-[10px]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
