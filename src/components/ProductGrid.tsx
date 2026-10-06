import ProductCard from '@/components/ProductCard';
import { sortProductsForShop, toCardData } from '@/lib/products';
import { MATERIAL_GROUPS } from '@/lib/shop/materials';
import type { Product, ProductCardData } from '@/types';

const headingClass = 'type-h3 mb-[10px] border-b border-oslo pb-[10px]';

/**
 * Dense packing lets a later standard card fill the hole a wide card would
 * otherwise leave at the end of a row. It only reorders within one grid, i.e.
 * within one material section.
 */
function Grid({ cards, wide = false }: { cards: ProductCardData[]; wide?: boolean }) {
  return (
    <div className="grid grid-flow-row-dense grid-cols-2 gap-[10px] md:grid-cols-3">
      {cards.map((c) => (
        <ProductCard key={c.productId} product={c} wide={wide} />
      ))}
    </div>
  );
}

/**
 * Canonical catalog grid: 2 columns on mobile, 3 on desktop (Figma), 10px gap.
 * Maps raw Sanity products to card data server-side, then renders client cards.
 *
 * Available pieces are split into material sections — Gold, Silver, Other, in
 * that order, each with an anchor the Shop sidebar links to (/shop#gold) — and
 * may span 2–3 columns as set in the Studio. Sold-out pieces follow in their own
 * section, gold first, always at standard width: a piece nobody can buy
 * shouldn't take the feature slot.
 */
export default function ProductGrid({ products }: { products: Product[] }) {
  const cards = sortProductsForShop(products).map(toCardData);
  const available = cards.filter((c) => c.inStock);
  const soldOut = cards.filter((c) => !c.inStock);
  const sections = MATERIAL_GROUPS.map((g) => ({
    ...g,
    cards: available.filter((c) => c.materialGroup === g.value),
  })).filter((s) => s.cards.length > 0);

  return (
    <>
      {sections.length ? (
        <div className="flex flex-col gap-[40px] md:gap-[60px]">
          {sections.map((s) => (
            <section key={s.value} id={s.value} className="scroll-mt-[80px]">
              <h2 className={headingClass}>{s.label.toUpperCase()}</h2>
              <Grid cards={s.cards} wide />
            </section>
          ))}
        </div>
      ) : (
        <p className="type-p1 text-oslo">No pieces available right now. Please check back soon.</p>
      )}

      {soldOut.length > 0 && (
        <section className="mt-[40px] md:mt-[60px]">
          <h2 className={`${headingClass} text-oslo`}>SOLD OUT</h2>
          <Grid cards={soldOut} />
        </section>
      )}
    </>
  );
}
