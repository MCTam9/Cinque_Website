'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import type { ProductCardData } from '@/types';

/**
 * Canonical product card (Figma 308×612): image over an info block with
 * spec rows, price, and a real Add-to-cart button. Image is B&W → colour on
 * card hover. Adds the default variant; the PDP handles full variant choice.
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
      {/* Image + title link to the PDP */}
      <Link href={`/shop/${product.slug}`} className="group block">
        <div className="relative aspect-[308/462] w-full overflow-hidden bg-cloud/30">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="img-bw object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center type-p2 text-oslo">
              No image
            </div>
          )}
        </div>
      </Link>

      {/* Info block */}
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Link href={`/shop/${product.slug}`} className="type-p1 hover:text-redcurrent">
          {product.title}
        </Link>

        <dl className="flex gap-4 type-p2 text-oslo">
          <div className="flex flex-col gap-1">
            {product.drop && <dt>Drop</dt>}
            {product.material && <dt>Material</dt>}
            {product.size && <dt>Size</dt>}
          </div>
          <div className="flex flex-col gap-1 text-graphite">
            {product.drop && <dd>{product.drop}</dd>}
            {product.material && <dd>{product.material}</dd>}
            {product.size && <dd>{product.size}</dd>}
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between border-t border-oslo/50 pt-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="type-p2 min-h-[44px] px-1 text-left uppercase tracking-wide text-graphite underline underline-offset-4 transition-colors hover:text-redcurrent disabled:text-oslo disabled:no-underline"
          >
            {canAdd ? 'Add to cart' : 'Sold out'}
          </button>
          <span className="type-p1">{formatGBP(product.priceGBP)}</span>
        </div>
      </div>
    </article>
  );
}
