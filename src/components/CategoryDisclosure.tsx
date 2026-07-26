'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mobile CATEGORY dropdown. Replaces a native <details> so the panel's open
 * state is ours to drive — <details> gives no way to animate the close, since
 * it snaps `display` on the panel. Here the panel stays mounted and the shared
 * `.dropdown-overlay` transitions it both ways off `data-open`. Closes on
 * outside click, Escape, or selection.
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
        // Padding gives the label a 44px tap target; the negative margin keeps
        // its layout box text-sized so the header row doesn't shift.
        className="type-h3 -m-[13px] cursor-pointer p-[13px]"
      >
        {label}
      </button>
      {/* Floating, so there's no page below to displace and no height to
          animate — it fades and slides, in both directions (see
          .dropdown-overlay). Collapsed it's `visibility: hidden`, which
          is what keeps it from swallowing clicks on the row beneath it
          and its links out of the tab order. */}
      <div
        onClick={() => setOpen(false)}
        data-open={open}
        className="dropdown-overlay absolute right-0 top-full z-20 mt-[10px] border border-oslo bg-cararra px-[20px] py-[10px]"
      >
        {children}
      </div>
    </div>
  );
}
