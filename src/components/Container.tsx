import type { ElementType, ReactNode } from 'react';

/**
 * Single source of page width. Reproduces the canon layout: a centred content
 * column (900px, matching the Figma grid) with side gutters on desktop, and
 * full-width with comfortable padding on mobile.
 *
 * `width="frame"` opts into the full 1440 desktop frame for edge-to-edge rows.
 */
export default function Container({
  children,
  className = '',
  width = 'content',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  width?: 'content' | 'frame';
  as?: ElementType;
}) {
  const max = width === 'frame' ? 'max-w-frame' : 'max-w-content';
  return (
    <Tag className={`mx-auto w-full ${max} px-5 md:px-6 ${className}`.trim()}>
      {children}
    </Tag>
  );
}
