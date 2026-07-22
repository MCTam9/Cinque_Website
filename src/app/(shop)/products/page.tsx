import { sanityClient } from '@/lib/sanity/client';
import { activeProductsQuery } from '@/lib/sanity/queries';
import type { Product } from '@/types';

// Revalidate periodically; pair with on-demand revalidation from Sanity webhook.
export const revalidate = 60;

/**
 * Catalog grid — placeholder. Data pipeline is wired; swap the markup for the
 * exported Figma product-card grid.
 */
export default async function ProductsPage() {
  const products = await sanityClient.fetch<Product[]>(activeProductsQuery);

  return (
    <main>
      <h1>Shop</h1>
      <ul>
        {products.map((p) => (
          <li key={p._id}>
            {/* Replace with <ProductCard product={p} /> */}
            {p.title} — {p.variants?.length ?? 0} variant(s)
          </li>
        ))}
      </ul>
    </main>
  );
}
