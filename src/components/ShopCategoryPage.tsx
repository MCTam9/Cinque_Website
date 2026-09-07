import JsonLd from '@/components/JsonLd';
import ProductGrid from '@/components/ProductGrid';
import RingSizeChart from '@/components/RingSizeChart';
import ShopLayout from '@/components/ShopLayout';
import { P1 } from '@/components/typography';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import { categoryBy } from '@/lib/shop/categories';
import { getCategoryProducts } from '@/lib/shop/getCategoryProducts';
import type { ProductCategory } from '@/types';

/**
 * A Shop category landing page (/shop/rings, …).
 *
 * These replaced `/shop?category=rings`: a query string is a poor ranking
 * target and could not be listed in the sitemap. Each category now has a real
 * URL, its own copy and its own metadata.
 */
export default async function ShopCategoryPage({ category }: { category: ProductCategory }) {
  const { label, description } = categoryBy(category);

  const products = await getCategoryProducts(category);

  return (
    <ShopLayout active={category} filterable titleAs="p">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: label, path: `/shop/${category}` },
        ])}
      />
      {products.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${label} — Cinque`,
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

      <h1 className="type-h2 mb-[10px]">{label}</h1>
      <P1 className="mb-[30px] max-w-[60ch] text-graphite">{description}</P1>

      {products.length === 0 ? (
        // 200, not 404: a category that empties out temporarily should not
        // churn in the index.
        <P1 className="text-oslo">No pieces in this category right now.</P1>
      ) : (
        <ProductGrid products={products} />
      )}

      {category === 'rings' && (
        <div className="mt-[40px] md:mt-[60px]">
          <RingSizeChart />
        </div>
      )}
    </ShopLayout>
  );
}
