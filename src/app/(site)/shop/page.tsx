import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import ProductGrid from '@/components/ProductGrid';
import RingSizeChart from '@/components/RingSizeChart';
import ShopLayout from '@/components/ShopLayout';
import { sanityFetch } from '@/lib/sanity/fetch';
import { shopProductsQuery } from '@/lib/sanity/queries';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import { sortByCategoryThenTitle } from '@/lib/shop/categories';
import type { Product } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Individually made, cast and hallmarked in London. Shop Cinque® jewellery and objects.',
  // Collapses any stray query string (e.g. the old ?category=all) onto one URL.
  alternates: { canonical: '/shop' },
};

/**
 * The full catalog. Category filtering used to happen here via `?category=`,
 * which meant this route could never be statically rendered and the filtered
 * views were not crawlable. Each category now has its own route under
 * /shop/<category>; this page always lists everything.
 */
export default async function ShopPage() {
  // Grouped by category in sidebar order, A–Z within each.
  const products = sortByCategoryThenTitle(
    await sanityFetch<Product[]>({
      label: 'shopProducts',
      query: shopProductsQuery,
      fallback: [],
    })
  );

  return (
    <ShopLayout active="all" filterable>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
        ])}
      />
      {products.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Shop — Cinque',
            numberOfItems: products.length,
            itemListElement: products.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: absoluteUrl(`/shop/${p.slug}`),
              name: p.title,
            })),
          }}
        />
      )}

      <ProductGrid products={products} />

      <div className="mt-[40px] md:mt-[60px]">
        <RingSizeChart />
      </div>
    </ShopLayout>
  );
}
