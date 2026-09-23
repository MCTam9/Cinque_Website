import Link from 'next/link';
import Image from 'next/image';
import { formatGBP } from '@/lib/products';
import type { ProductCardData } from '@/types';

/**
 * Product card (Figma): 2:3 photo → info panel with a bordered title, a
 * two-column spec block (labels left / values right), and the price (right
 * aligned), or [SOLD OUT] in its place. An available card is a single link to
 * the PDP; a sold-out card is not a link at all — shoppers can't click through
 * to a piece they can't buy (the PDP itself still exists at its URL).
 */
export default function ProductCard({ product }: { product: ProductCardData }) {
  const className = 'group flex flex-col border border-oslo bg-cararra';
  const body = (
    <>
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

      <div className="flex flex-1 flex-col gap-[10px] p-[10px]">
        <span
          className={`type-h3 border-b border-oslo/60 pb-[10px] ${
            product.inStock ? 'group-hover:text-redcurrent' : ''
          }`}
        >
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

        <span className={`type-p1 mt-auto text-right ${product.inStock ? '' : 'text-oslo'}`}>
          {product.inStock ? formatGBP(product.priceGBP) : '[SOLD OUT]'}
        </span>
      </div>
    </>
  );

  return product.inStock ? (
    <Link href={`/shop/${product.slug}`} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
