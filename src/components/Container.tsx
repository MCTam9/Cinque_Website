import type { ElementType, ReactNode } from 'react';

/**
 * The canonical page shell, shared by every page. Reproduces the Figma Shop-page
 * grid:
 *   grid-template-columns: minmax(0,0.25fr) minmax(0,1fr) minmax(0,0.25fr)
 * — a fluid centre column with 0.25fr side gutters — centred and capped at
 * `max-w-frame` so it stays aligned with the nav and footer on wide monitors.
 * On mobile it collapses to a single full-width column with 20px page padding.
 *
 * `Container` places its children in the centre column. Pages that also need the
 * left gutter (Shop's category rail, Lookbook's drop rail) apply `shellGrid`
 * themselves and place every child with `md:col-start-*` / `md:row-start-*`.
 *
 * Vertical padding is the caller's — pass `contentPadY` or `statusPadY` below.
 */
export const shellGrid =
  'mx-auto grid w-full max-w-frame grid-cols-1 gap-x-[10px] px-5 md:grid-cols-[minmax(0,0.25fr)_minmax(0,1fr)_minmax(0,0.25fr)]';

/**
 * Vertical page padding, in two flavours.
 *
 * Mobile sits tight under the nav — the nav's own rule already leaves 22px of
 * air below it, so a large top padding read as a gap rather than as spacing.
 * Both open up from md, where the nav is further from the content.
 */
export const contentPadY = 'pt-[10px] pb-[40px] md:py-[60px]';

/** Sparse status pages (404, errors, checkout return) carry more air. */
export const statusPadY = 'pt-[30px] pb-[60px] md:py-[80px]';

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
