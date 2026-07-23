import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/Container';
import ProductGrid from '@/components/ProductGrid';
import { H1, P1 } from '@/components/typography';
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

  const filtered =
    active === 'all' ? products : products.filter((p) => p.category === active);

  return (
    <Container className="py-12 md:py-16">
      <header className="mb-8 flex flex-col gap-2">
        <H1 className="font-bold">SHOP</H1>
        <P1 className="text-oslo">Contact us if you would like a bespoke commission.</P1>
      </header>

      {/* Category filter */}
      <nav aria-label="Categories" className="mb-8 flex flex-wrap gap-x-5 gap-y-2">
        {CATEGORIES.map((c) => {
          const isActive = c.value === active;
          const href = c.value === 'all' ? '/shop' : `/shop?category=${c.value}`;
          return (
            <Link
              key={c.value}
              href={href}
              className={`type-p1 transition-colors ${
                isActive
                  ? 'text-redcurrent underline underline-offset-4'
                  : 'text-oslo hover:text-graphite'
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      <ProductGrid products={filtered} />
    </Container>
  );
}
