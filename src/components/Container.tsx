import type { ElementType, ReactNode } from 'react';

/**
 * Canonical page shell. Reproduces the Figma Shop-page grid:
 *   grid-template-columns: minmax(0,0.25fr) minmax(0,1fr) minmax(0,0.25fr)
 * — a fluid centre column with 0.25fr side gutters — capped at the 1440 frame
 * so it aligns with the nav. On mobile it collapses to a single full-width
 * column with comfortable padding.
 *
 * Content is placed in the centre column. `bleed` lets a child opt out and use
 * the full frame width (edge-to-edge rows) by rendering it outside the grid.
 */
export default function Container({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={`grid w-full grid-cols-1 gap-x-[10px] px-5 md:grid-cols-[minmax(0,0.25fr)_minmax(0,1fr)_minmax(0,0.25fr)] ${className}`.trim()}
    >
      <div className="min-w-0 md:col-start-2">{children}</div>
    </Tag>
  );
}
