import type { ElementType } from 'react';
import Link from 'next/link';
import { contentPadY, shellGrid } from '@/components/Container';
import { H1, P2 } from '@/components/typography';
import CategoryDisclosure from '@/components/CategoryDisclosure';
import { SHOP_CATEGORIES } from '@/lib/shop/categories';

/**
 * Shared Shop chrome (Figma): the SHOP heading + subtitle in the centre column
 * with a rule beneath it, and a matching rule above the SHOP_CATEGORY sidebar
 * in the left 0.25fr gutter. Catalog (Shop) and product page (PDP) both render
 * inside it; `children` go in the centre column. `filterable` shows the mobile
 * FILTER control (catalog only).
 */
// 'All' plus the shared category list — the categories themselves live in
// src/lib/shop/categories.ts, which the routes and the Sanity slug validation
// also read, so this list cannot drift from the routes that exist.
const CATEGORIES = [
  { label: 'All', value: 'all' },
  ...SHOP_CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
] as const;

function CategoryList({ active }: { active: string }) {
  return (
    <ul className="flex flex-col gap-[10px]">
      {CATEGORIES.map((c) => {
        const isActive = c.value === active;
        // Real routes now, not query strings — see src/lib/shop/categories.ts.
        const href = c.value === 'all' ? '/shop' : `/shop/${c.value}`;
        return (
          <li key={c.value}>
            <Link
              href={href}
              className={`type-h3 transition-colors ${
                isActive
                  ? 'text-redcurrent underline underline-offset-4'
                  : 'text-graphite hover:text-redcurrent'
              }`}
            >
              {c.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function ShopLayout({
  active = 'all',
  filterable = false,
  titleHref,
  titleAs,
  children,
}: {
  active?: string;
  filterable?: boolean;
  /** When set, the SHOP title becomes a link (e.g. back to /shop from a PDP). */
  titleHref?: string;
  /**
   * Element for the SHOP title. Defaults to `h1` for the catalog itself; pages
   * nested inside this chrome (a PDP, a category listing) pass `"p"` so their
   * own subject gets the page's single <h1> instead of the word "SHOP".
   * Visual styling is unchanged either way.
   */
  titleAs?: ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className={`${shellGrid} ${contentPadY}`}>
      {/* Rule above the sidebar (left gutter) — aligns with the header rule */}
      <div className="hidden border-b border-oslo md:col-start-1 md:row-start-1 md:block" />

      {/* Header — centre column, with rule beneath */}
      <header className="flex items-end justify-between border-b border-oslo pb-[10px] md:col-start-2 md:row-start-1">
        {titleHref ? (
          <Link href={titleHref} className="hover:text-redcurrent">
            <H1 as={titleAs}>SHOP</H1>
          </Link>
        ) : (
          <H1 as={titleAs}>SHOP</H1>
        )}
        <Link
          href="/studio#contact"
          className="type-p1 hidden text-right text-oslo hover:text-redcurrent md:block"
        >
          Contact us if you would like a bespoke commission
        </Link>
        {filterable && (
          <CategoryDisclosure className="md:hidden">
            <CategoryList active={active} />
          </CategoryDisclosure>
        )}
      </header>

      {/* Category sidebar — left gutter (desktop), top-aligned with the grid */}
      <aside className="hidden pt-[10px] md:col-start-1 md:row-start-2 md:block md:pr-4">
        <P2 className="mb-[10px] text-oslo">CATEGORY</P2>
        <CategoryList active={active} />
      </aside>

      {/* Centre column content */}
      <div className="pt-[10px] md:col-start-2 md:row-start-2">{children}</div>
    </div>
  );
}
