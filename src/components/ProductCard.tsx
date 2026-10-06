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
 *
 * `wide` cards (Studio: Card size 2 or 3, available pieces only) span two or
 * three grid columns — mobile caps them at two. They lay out side by side
 * instead: the photo across every column but the last, the same info panel in
 * the last. The card is a subgrid of the catalog grid, so that panel lines up
 * exactly with the column it sits in.
 */
export default function ProductCard({
  product,
  wide = false,
}: {
  product: ProductCardData;
  wide?: boolean;
}) {
  const isWide = wide && product.cardSize > 1 && Boolean(product.wideImageUrl);
  // Static class strings, so Tailwind sees every one of them.
  const extraWide = isWide && product.cardSize === 3;
  const className = isWide
    ? `group grid grid-cols-subgrid border border-oslo bg-cararra ${
        extraWide ? 'col-span-2 md:col-span-3' : 'col-span-2'
      }`
    : 'group flex flex-col border border-oslo bg-cararra';

  const info = (
    <div className="flex flex-1 flex-col gap-[10px] p-[10px]">
      <span
        className={`type-h3 border-b border-oslo/60 pb-[10px] ${
          product.inStock ? 'group-hover:text-redcurrent' : ''
        }`}
      >
        {product.title}
      </span>

      {/* One grid row per label/value pair, so a value that wraps (a long
          drop name on a narrow card) pushes the rows below it down with it
          instead of drifting out of line with its label. */}
      <dl className="grid grid-cols-[auto_1fr] gap-y-0.5 type-p2">
        <dt className="text-oslo">Drop</dt>
        <dd className="text-right text-graphite">{product.drop || '—'}</dd>
        <dt className="text-oslo">Material</dt>
        <dd className="text-right text-graphite">{product.material || '—'}</dd>
        <dt className="text-oslo">Edition</dt>
        <dd className="text-right text-graphite">{product.edition || '—'}</dd>
      </dl>

      <span className={`type-p1 mt-auto text-right ${product.inStock ? '' : 'text-oslo'}`}>
        {product.inStock ? formatGBP(product.priceGBP) : '[SOLD OUT]'}
      </span>
    </div>
  );

  const body = isWide ? (
    <>
      {/* The photo fills its columns at whatever height the row settles on;
          the spacer only sets a floor (2:3 in one column, about 4:3 across
          two), so a row shared with a standard card stretches it rather than
          leaving a gap beneath it. */}
      <div
        className={`relative overflow-hidden bg-cloud/30 ${
          extraWide ? 'col-span-1 md:col-span-2' : 'col-span-1'
        }`}
      >
        <div aria-hidden className={extraWide ? 'aspect-[2/3] md:aspect-[4/3]' : 'aspect-[2/3]'} />
        <Image
          src={product.wideImageUrl!}
          alt={product.wideImageAlt ?? product.imageAlt}
          fill
          sizes={extraWide ? '(max-width: 768px) 50vw, 66vw' : '(max-width: 768px) 50vw, 33vw'}
          className="img-bw object-cover"
          style={{ objectPosition: product.wideImagePosition }}
        />
      </div>
      <div className="col-span-1 flex">{info}</div>
    </>
  ) : (
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
      {info}
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
