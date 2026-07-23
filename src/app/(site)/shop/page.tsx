import type { Metadata } from 'next';
import ProductGrid from '@/components/ProductGrid';
import RingSizeChart from '@/components/RingSizeChart';
import ShopLayout from '@/components/ShopLayout';
import { sanityClient } from '@/lib/sanity/client';
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

  let products: Product[] = [];
  try {
    products = await sanityClient.fetch<Product[]>(activeProductsQuery);
  } catch {
    products = [];
  }
  const filtered = active === 'all' ? products : products.filter((p) => p.category === active);

  return (
    <ShopLayout active={active} filterable>
      <ProductGrid products={filtered} />
      <div className="mt-[60px]">
        <RingSizeChart />
      </div>
    </ShopLayout>
  );
}
