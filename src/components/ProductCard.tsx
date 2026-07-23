'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import type { ProductCardData } from '@/types';

/**
 * Product card (Figma): 2:3 photo → info panel with a bordered title, a
 * two-column spec block (labels left / values right), a bordered Add-to-cart
 * button, and the price. Image is B&W → colour on card hover.
 */
export default function ProductCard({ product }: { product: ProductCardData }) {
  const addLine = useCart((s) => s.addLine);
  const canAdd = product.inStock && Boolean(product.variantKey && product.sku);

  const handleAdd = () => {
    if (!product.variantKey || !product.sku) return;
    addLine({
      productId: product.productId,
      variantKey: product.variantKey,
      sku: product.sku,
      title: product.title,
      unitPriceGBP: product.priceGBP,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <article className="flex flex-col border border-oslo bg-cararra">
      <Link href={`/shop/${product.slug}`} className="group block">
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-cloud/30">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="img-bw object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center type-p2 text-oslo">No image</div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-2.5">
        <Link
          href={`/shop/${product.slug}`}
          className="type-p1 border-b border-oslo/60 pb-[10px] hover:text-redcurrent"
        >
          {product.title}
        </Link>

        <dl className="flex justify-between type-p2">
          <div className="flex flex-col gap-0.5 text-oslo">
            <dt>Drop</dt>
            <dt>Material</dt>
            <dt>Size</dt>
          </div>
          <div className="flex flex-col gap-0.5 text-right text-graphite">
            <dd>{product.drop || '—'}</dd>
            <dd>{product.material || '—'}</dd>
            <dd>{product.size || '—'}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="type-p2 mt-auto min-h-[40px] border border-graphite text-graphite transition-colors hover:bg-graphite hover:text-cararra disabled:border-oslo disabled:text-oslo disabled:hover:bg-transparent"
        >
          {canAdd ? 'Add to cart' : 'Sold out'}
        </button>

        <span className="type-p1">{formatGBP(product.priceGBP)}</span>
      </div>
    </article>
  );
}
