import Link from 'next/link';
import Image from 'next/image';
import { formatGBP } from '@/lib/products';
import type { ProductCardData } from '@/types';

/**
 * Product card (Figma): 2:3 photo → info panel with a bordered title, a
 * two-column spec block (labels left / values right), and the price (right
 * aligned). Add-to-cart lives on the product page, not the card.
 */
export default function ProductCard({ product }: { product: ProductCardData }) {
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
            <dt>Edition</dt>
          </div>
          <div className="flex flex-col gap-0.5 text-right text-graphite">
            <dd>{product.drop || '—'}</dd>
            <dd>{product.material || '—'}</dd>
            <dd>{product.edition || '—'}</dd>
          </div>
        </dl>

        <span className="type-p1 mt-auto text-right">{formatGBP(product.priceGBP)}</span>
      </div>
    </article>
  );
}
