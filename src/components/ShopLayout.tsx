import Link from 'next/link';
import { H1, P1, P2 } from '@/components/typography';

/**
 * Shared Shop chrome (Figma): the SHOP heading + subtitle in the centre column
 * with a rule beneath it, and a matching rule above the SHOP_CATEGORY sidebar
 * in the left 0.25fr gutter. Catalog (Shop) and product page (PDP) both render
 * inside it; `children` go in the centre column. `filterable` shows the mobile
 * FILTER control (catalog only).
 */
const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Rings', value: 'rings' },
  { label: 'Earrings', value: 'earrings' },
  { label: 'Necklaces', value: 'necklaces' },
  { label: 'Objects', value: 'objects' },
] as const;

function CategoryList({ active }: { active: string }) {
  return (
    <ul className="flex flex-col gap-[10px]">
      {CATEGORIES.map((c) => {
        const isActive = c.value === active;
        const href = c.value === 'all' ? '/shop' : `/shop?category=${c.value}`;
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
  children,
}: {
  active?: string;
  filterable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-frame grid-cols-1 gap-x-[10px] px-5 py-[40px] md:grid-cols-[minmax(0,0.25fr)_minmax(0,1fr)_minmax(0,0.25fr)] md:py-[60px]">
      {/* Rule above the sidebar (left gutter) — aligns with the header rule */}
      <div className="hidden border-b border-graphite md:col-start-1 md:row-start-1 md:block" />

      {/* Header — centre column, with rule beneath */}
      <header className="mb-[30px] flex items-end justify-between border-b border-graphite pb-[10px] md:col-start-2 md:row-start-1 md:mb-0">
        <H1>SHOP</H1>
        <P1 className="hidden text-right text-oslo md:block">
          Contact us if you would like a bespoke commission
        </P1>
        {filterable && (
          <details className="md:hidden">
            <summary className="type-h3 cursor-pointer list-none">FILTER</summary>
            <div className="mt-[10px]">
              <CategoryList active={active} />
            </div>
          </details>
        )}
      </header>

      {/* Category sidebar — left gutter (desktop), top-aligned with the grid */}
      <aside className="hidden pt-[10px] md:col-start-1 md:row-start-2 md:block md:pr-4">
        <P2 className="mb-[10px] text-oslo">SHOP_CATEGORY</P2>
        <CategoryList active={active} />
      </aside>

      {/* Centre column content */}
      <div className="pt-[10px] md:col-start-2 md:row-start-2">{children}</div>
    </div>
  );
}
