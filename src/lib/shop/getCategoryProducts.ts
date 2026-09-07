import { cache } from 'react';
import { sanityFetch } from '@/lib/sanity/fetch';
import { productsByCategoryQuery } from '@/lib/sanity/queries';
import type { Product, ProductCategory } from '@/types';

/**
 * Active products in one category, memoized for the lifetime of a request.
 *
 * `generateMetadata` and the page body both need this (metadata to decide
 * whether the listing is empty and should be noindexed). React's `cache`
 * collapses that into a single Sanity read.
 */
export const getCategoryProducts = cache(
  async (category: ProductCategory): Promise<Product[]> =>
    sanityFetch<Product[]>({
      label: `products:${category}`,
      query: productsByCategoryQuery,
      params: { category },
      fallback: [],
    })
);
