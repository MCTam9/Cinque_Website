'use client';

import { useState } from 'react';
import Link from 'next/link';
import { H1, P1 } from '@/components/typography';

export type DropLink = { slug: string; label: string };

/**
 * Lookbook header (mobile): LOOKBOOK title with a SHOW ALL / HIDE toggle on the
 * right. The drop list expands as a left-aligned row directly below the title
 * (open by default). Desktop keeps the subtitle and defers to the sidebar.
 */
export default function LookbookHeader({
  drops,
  active,
}: {
  drops: DropLink[];
  active: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <header className="border-b border-oslo pb-[10px] md:col-start-2 md:row-start-1">
      <div className="flex items-end justify-between">
        <H1>LOOKBOOK</H1>
        <P1 className="hidden text-right text-oslo md:block">
          Individually made, cast and hallmarked in London.
        </P1>
        {/* Padding gives the label a 44px tap target; the matching negative
            margin keeps its layout box the size of the text, so the row's
            baseline alignment is unchanged. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="type-h3 -m-[13px] p-[13px] text-graphite md:hidden"
        >
          {open ? 'HIDE' : 'SHOW ALL'}
        </button>
      </div>

      {/* Kept mounted so HIDE collapses the list rather than dropping it
          (see .dropdown-panel). md:hidden goes on the outer wrapper so it
          beats the panel's `display: grid`, and the 10px above the list is
          padding on the list itself — inside the bare clipper, so it
          collapses away with everything else instead of leaving a gap
          under the title. Open on first render, which is a plain state,
          so nothing animates on load. */}
      <div className="md:hidden">
        <div data-open={open} className="dropdown-panel">
          <div>
            <ul className="flex flex-col gap-[10px] pt-[10px]">
              {drops.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/lookbook?drop=${d.slug}`}
                    className={`type-h3 ${
                      d.slug === active
                        ? 'text-redcurrent underline underline-offset-4'
                        : 'text-graphite'
                    }`}
                  >
                    {d.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
