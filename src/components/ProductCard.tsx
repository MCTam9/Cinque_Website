import Link from 'next/link';
import Image from 'next/image';
import { formatGBP } from '@/lib/products';
import type { ProductCardData } from '@/types';

/**
 * Product card (Figma): 2:3 photo → info panel with a bordered title, a
 * two-column spec block (labels left / values right), and the price (right
 * aligned). The whole card is a single link to the PDP.
 */
export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col border border-oslo bg-cararra"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-cloud/30">
        {!product.inStock && (
          <span className="absolute left-2 top-2 z-10 bg-cararra/90 px-2 py-1 type-p2 text-graphite">
            Sold out
          </span>
        )}
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

      <div className="flex flex-1 flex-col gap-[10px] p-[10px]">
        <span className="type-h3 border-b border-oslo/60 pb-[10px] group-hover:text-redcurrent">
          {product.title}
        </span>

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
    </Link>
  );
}
