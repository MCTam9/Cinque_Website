import type { ElementType, ReactNode } from 'react';

/**
 * Canonical type primitives (H1–H3, P1–P2). Each maps to a `.type-*` class in
 * globals.css so the scale is defined once. Pass `as` to change the rendered
 * element without changing the visual style (e.g. an H1-styled <span>).
 */

type TypeProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

function make(defaultTag: ElementType, typeClass: string) {
  return function TypeComponent({ children, className = '', as }: TypeProps) {
    const Tag = as ?? defaultTag;
    return <Tag className={`${typeClass} ${className}`.trim()}>{children}</Tag>;
  };
}

export const H1 = make('h1', 'type-h1');
export const H2 = make('h2', 'type-h2');
export const H3 = make('h3', 'type-h3');
export const P1 = make('p', 'type-p1');
export const P2 = make('p', 'type-p2');
