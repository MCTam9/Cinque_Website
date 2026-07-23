import ProductCard from '@/components/ProductCard';
import { toCardData } from '@/lib/products';
import type { Product } from '@/types';

/**
 * Canonical catalog grid: 2 columns on mobile, 3 on desktop (Figma), 10px gap.
 * Maps raw Sanity products to card data server-side, then renders client cards.
 */
export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return <p className="type-p1 text-oslo">No pieces available right now. Please check back soon.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-[10px] md:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p._id} product={toCardData(p)} />
      ))}
    </div>
  );
}
