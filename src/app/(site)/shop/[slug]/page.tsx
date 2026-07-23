import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { productBySlugQuery, productSlugsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import { metalLabel, formatLabel } from '@/lib/products';
import ShopLayout from '@/components/ShopLayout';
import JsonLd from '@/components/JsonLd';
import { H2, P1, P2 } from '@/components/typography';
import ProductPurchase, { type PurchaseVariant } from '@/components/ProductPurchase';
import RingSizeChart from '@/components/RingSizeChart';
import type { CollectionRef, SanityImageRef, Variant } from '@/types';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface PDPProduct {
  _id: string;
  title: string;
  slug: string;
  status: string;
  edition?: string;
  careInstructions?: string;
  images?: SanityImageRef[];
  collection?: CollectionRef;
  variants: Variant[];
}

async function getProduct(slug: string): Promise<PDPProduct | null> {
  try {
    return await sanityClient.fetch<PDPProduct | null>(productBySlugQuery, { slug });
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(productSlugsQuery);
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product' };
  const first = product.images?.[0];
  const ogImage = first?.asset ? urlFor(first as never).width(1200).height(1200).url() : undefined;
  return {
    title: formatLabel(product.title),
    description: `${product.title} — Cinque®. Individually made, cast and hallmarked in London.`,
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  };
}

function variantSwatch(v: Variant): string {
  return v.size || metalLabel(v.metalType)?.replace(/_/g, ' ') || v.sku;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const images = (product.images ?? []).filter((i) => i.asset);
  const imageUrls = images.map((img) => ({
    url: urlFor(img as never).width(900).height(1200).fit('crop').url(),
    thumb: urlFor(img as never).width(300).height(400).fit('crop').url(),
    alt: img.alt || product.title,
  }));
  const thumbUrl = images[0]?.asset ? urlFor(images[0] as never).width(200).url() : undefined;

  const purchaseVariants: PurchaseVariant[] = (product.variants ?? []).map((v) => ({
    key: v._key,
    sku: v.sku,
    swatch: variantSwatch(v),
    label: [metalLabel(v.metalType), v.size].filter(Boolean).join(' · ') || v.sku,
    priceGBP: v.priceGBP,
    inStock: v.stockQuantity > 0 || Boolean(v.allowBackorder),
  }));

  const drop =
    product.collection?.title &&
    (typeof product.collection.dropNumber === 'number'
      ? `${String(product.collection.dropNumber).padStart(2, '0')}/${product.collection.title}`
      : product.collection.title);
  const material = metalLabel(product.variants?.[0]?.metalType);
  const minPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.priceGBP))
    : 0;
  const anyInStock = purchaseVariants.some((v) => v.inStock);
  const hasThumbs = imageUrls.length > 1;

  return (
    <ShopLayout active="all">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: formatLabel(product.title),
          image: imageUrls.map((i) => i.url),
          description: `${product.title} — Cinque®. Individually made, cast and hallmarked in London.`,
          brand: { '@type': 'Brand', name: 'Cinque' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'GBP',
            price: (minPrice / 100).toFixed(2),
            availability: anyInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${siteUrl}/shop/${product.slug}`,
          },
        }}
      />

      {/* Product layout: title over gallery (2/3) + info (1/3) */}
      <div className="grid grid-cols-1 gap-x-[10px] md:grid-cols-3">
        {/* Title row */}
        <H2 className="mb-[10px] border-b border-oslo pb-[10px] md:col-span-2">
          {formatLabel(product.title)}
        </H2>
        <div className="mb-[10px] hidden border-b border-oslo md:col-start-3 md:block" />

        {/* Gallery: main image (3fr) + vertical scrolling thumbnails (1fr) */}
        <div className="md:col-span-2 md:row-start-2">
          {imageUrls.length > 0 ? (
            <div className={`grid gap-[10px] ${hasThumbs ? 'md:grid-cols-[3fr_1fr]' : 'grid-cols-1'}`}>
              <div className="group relative aspect-[3/4] w-full overflow-hidden bg-cloud/30">
                <Image
                  src={imageUrls[0].url}
                  alt={imageUrls[0].alt}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="img-bw object-cover"
                />
              </div>
              {hasThumbs && (
                <div className="relative hidden md:block">
                  <div className="absolute inset-0 flex flex-col gap-[10px] overflow-y-auto">
                    {imageUrls.map((img) => (
                      <div
                        key={img.thumb}
                        className="group relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-cloud/30"
                      >
                        <Image
                          src={img.thumb}
                          alt={img.alt}
                          fill
                          sizes="15vw"
                          className="img-bw object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-cloud/30 type-p2 text-oslo">
              No image
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-[30px] flex flex-col gap-5 md:col-start-3 md:row-start-2 md:mt-0">
          <dl className="flex justify-between type-p1">
            <div className="flex flex-col gap-0.5 text-oslo">
              {drop && <dt>Drop</dt>}
              {material && <dt>Material</dt>}
              {product.edition && <dt>Edition</dt>}
            </div>
            <div className="flex flex-col gap-0.5 text-right text-graphite">
              {drop && <dd>{drop}</dd>}
              {material && <dd>{material}</dd>}
              {product.edition && <dd>{product.edition}</dd>}
            </div>
          </dl>

          {purchaseVariants.length > 0 && (
            <ProductPurchase
              productId={product._id}
              title={formatLabel(product.title)}
              variants={purchaseVariants}
              imageUrl={thumbUrl}
            />
          )}

          {product.careInstructions && (
            <div className="border-t border-oslo/50 pt-5">
              <P1 className="mb-[10px] font-bold">After Care</P1>
              <P1 className="whitespace-pre-line text-graphite">{product.careInstructions}</P1>
            </div>
          )}
        </div>
      </div>

      {/* Ring size chart — full centre width */}
      <div className="mt-[60px]">
        <RingSizeChart />
      </div>
    </ShopLayout>
  );
}
