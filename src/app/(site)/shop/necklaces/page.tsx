import type { Metadata } from 'next';
import ShopCategoryPage from '@/components/ShopCategoryPage';
import { categoryMetadata } from '@/lib/seo';
import { getCategoryProducts } from '@/lib/shop/getCategoryProducts';

// A literal segment, so it takes routing precedence over /shop/[slug].
// Product slugs that would collide are rejected in the Sanity schema.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const products = await getCategoryProducts('necklaces');
  return categoryMetadata('necklaces', { empty: products.length === 0 });
}

export default function Page() {
  return <ShopCategoryPage category="necklaces" />;
}
