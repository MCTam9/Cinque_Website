import ProductCard from '@/components/ProductCard';
import { toCardData } from '@/lib/products';
import type { Product, ProductCardData } from '@/types';

function Grid({ cards }: { cards: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-[10px] md:grid-cols-3">
      {cards.map((c) => (
        <ProductCard key={c.productId} product={c} />
      ))}
    </div>
  );
}

/**
 * Canonical catalog grid: 2 columns on mobile, 3 on desktop (Figma), 10px gap.
 * Maps raw Sanity products to card data server-side, then renders client cards.
 * Available pieces come first; sold-out pieces follow in their own section.
 */
export default function ProductGrid({ products }: { products: Product[] }) {
  const cards = products.map(toCardData);
  const available = cards.filter((c) => c.inStock);
  const soldOut = cards.filter((c) => !c.inStock);

  return (
    <>
      {available.length ? (
        <Grid cards={available} />
      ) : (
        <p className="type-p1 text-oslo">No pieces available right now. Please check back soon.</p>
      )}

      {soldOut.length > 0 && (
        <section className="mt-[40px] md:mt-[60px]">
          <h2 className="type-h3 mb-[10px] border-b border-oslo pb-[10px] text-oslo">SOLD OUT</h2>
          <Grid cards={soldOut} />
        </section>
      )}
    </>
  );
}
