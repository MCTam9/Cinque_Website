import type { Metadata } from 'next';
import Link from 'next/link';
import ProductGrid from '@/components/ProductGrid';
import RingSizeChart from '@/components/RingSizeChart';
import { H1, P1, P2 } from '@/components/typography';
import { sanityClient } from '@/lib/sanity/client';
import { activeProductsQuery } from '@/lib/sanity/queries';
import type { Product } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Individually made, cast and hallmarked in London. Shop Cinque® jewellery and objects.',
};

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Rings', value: 'rings' },
  { label: 'Earrings', value: 'earrings' },
  { label: 'Necklaces', value: 'necklaces' },
  { label: 'Objects', value: 'objects' },
] as const;

function CategoryList({ active }: { active: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {CATEGORIES.map((c) => {
        const isActive = c.value === active;
        const href = c.value === 'all' ? '/shop' : `/shop?category=${c.value}`;
        return (
          <li key={c.value}>
            <Link
              href={href}
              className={`type-h3 transition-colors ${
                isActive ? 'text-redcurrent underline underline-offset-4' : 'text-graphite hover:text-redcurrent'
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

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category && category !== 'all' ? category : 'all';

  let products: Product[] = [];
  try {
    products = await sanityClient.fetch<Product[]>(activeProductsQuery);
  } catch {
    products = [];
  }
  const filtered = active === 'all' ? products : products.filter((p) => p.category === active);

  return (
    <div className="mx-auto grid w-full max-w-frame grid-cols-1 gap-x-[10px] px-5 py-[40px] md:grid-cols-[minmax(0,0.25fr)_minmax(0,1fr)_minmax(0,0.25fr)] md:px-0 md:py-[60px]">
      {/* Header — centre column */}
      <header className="mb-5 flex items-end justify-between border-b border-graphite pb-[10px] md:col-start-2 md:row-start-1">
        <H1>SHOP</H1>
        <P1 className="hidden text-right text-oslo md:block">
          Contact us if you would like a bespoke commission.
        </P1>
        {/* Mobile filter */}
        <details className="md:hidden">
          <summary className="type-h3 cursor-pointer list-none">FILTER</summary>
          <div className="mt-[10px]">
            <CategoryList active={active} />
          </div>
        </details>
      </header>

      {/* Category sidebar — left gutter (desktop) */}
      <aside className="hidden md:col-start-1 md:row-start-2 md:block md:pr-4">
        <P2 className="mb-2 text-oslo">SHOP_CATEGORY</P2>
        <CategoryList active={active} />
      </aside>

      {/* Product grid + ring-size chart — centre column */}
      <div className="md:col-start-2 md:row-start-2">
        <ProductGrid products={filtered} />
        <div className="mt-[40px]">
          <RingSizeChart />
        </div>
      </div>
    </div>
  );
}
