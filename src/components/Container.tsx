import type { ElementType, ReactNode } from 'react';

/**
 * The canonical page shell, shared by every page. Reproduces the Figma Shop-page
 * grid:
 *   grid-template-columns: minmax(0,0.25fr) minmax(0,1fr) minmax(0,0.25fr)
 * — a fluid centre column with 0.25fr side gutters — centred and capped at the
 * 1440 frame so it stays aligned with the nav and footer on wide monitors. On
 * mobile it collapses to a single full-width column with 20px page padding.
 *
 * `Container` places its children in the centre column. Pages that also need the
 * left gutter (Shop's category rail, Lookbook's drop rail) apply `shellGrid`
 * themselves and place every child with `md:col-start-*` / `md:row-start-*`.
 *
 * Vertical padding is the caller's: content pages use `py-[40px] md:py-[60px]`,
 * sparse status pages (404, errors, checkout return) use `py-[60px] md:py-[80px]`.
 */
export const shellGrid =
  'mx-auto grid w-full max-w-frame grid-cols-1 gap-x-[10px] px-5 md:grid-cols-[minmax(0,0.25fr)_minmax(0,1fr)_minmax(0,0.25fr)]';

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
    <Tag className={`${shellGrid} ${className}`.trim()}>
      <div className="min-w-0 md:col-start-2">{children}</div>
    </Tag>
  );
}
