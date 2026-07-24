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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="type-h3 text-graphite md:hidden"
        >
          {open ? 'HIDE' : 'SHOW ALL'}
        </button>
      </div>

      {open && (
        <ul className="animate-dropdown mt-[10px] flex flex-col gap-[10px] md:hidden">
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
      )}
    </header>
  );
}
