import type { Metadata } from 'next';
import Link from 'next/link';
import ProductGrid from '@/components/ProductGrid';
import RingSizeChart from '@/components/RingSizeChart';
import ShopLayout from '@/components/ShopLayout';
import { P1 } from '@/components/typography';
import { sanityFetch } from '@/lib/sanity/fetch';
import { activeProductsQuery } from '@/lib/sanity/queries';
import type { Product } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Individually made, cast and hallmarked in London. Shop Cinque® jewellery and objects.',
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category && category !== 'all' ? category : 'all';

  const products = await sanityFetch<Product[]>({
    label: 'activeProducts',
    query: activeProductsQuery,
    fallback: [],
  });
  const filtered = active === 'all' ? products : products.filter((p) => p.category === active);

  return (
    <ShopLayout active={active} filterable>
      {filtered.length === 0 && active !== 'all' ? (
        <div>
          <P1 className="mb-5 text-oslo">No pieces in this category right now.</P1>
          <Link
            href="/shop"
            className="type-p1 inline-block border border-graphite px-6 py-3 transition-colors hover:bg-graphite hover:text-cararra"
          >
            Browse all
          </Link>
        </div>
      ) : (
        <ProductGrid products={filtered} />
      )}
      <div className="mt-[60px]">
        <RingSizeChart />
      </div>
    </ShopLayout>
  );
}
