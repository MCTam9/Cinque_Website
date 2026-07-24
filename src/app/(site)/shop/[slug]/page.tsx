import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { sanityFetch } from '@/lib/sanity/fetch';
import { productBySlugQuery, productSlugsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import { metalLabel, formatLabel } from '@/lib/products';
import ShopLayout from '@/components/ShopLayout';
import JsonLd from '@/components/JsonLd';
import { H2, P1 } from '@/components/typography';
import ProductPurchase, { type PurchaseVariant } from '@/components/ProductPurchase';
import ProductGallery from '@/components/ProductGallery';
import RingSizeChart from '@/components/RingSizeChart';
import type { CollectionRef, ProductCategory, SanityImageRef, Variant } from '@/types';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface PDPProduct {
  _id: string;
  title: string;
  slug: string;
  status: string;
  category?: ProductCategory;
  edition?: string;
  careInstructions?: string;
  images?: SanityImageRef[];
  collection?: CollectionRef;
  variants: Variant[];
}

async function getProduct(slug: string): Promise<PDPProduct | null> {
  return sanityFetch<PDPProduct | null>({
    label: `product:${slug}`,
    query: productBySlugQuery,
    params: { slug },
    fallback: null,
  });
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(productSlugsQuery);
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.error('[sanity] productSlugs failed — no product pages prerendered', err);
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
  // Distinct sizes across the variants (e.g. "M · P"); empty for sizeless pieces.
  const sizes = Array.from(
    new Set((product.variants ?? []).map((v) => v.size).filter(Boolean))
  ).join(' · ');
  const minPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.priceGBP))
    : 0;
  const anyInStock = purchaseVariants.some((v) => v.inStock);

  return (
    <ShopLayout active={product.category ?? 'all'} filterable titleHref="/shop">
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

        {/* Gallery: main image + clickable thumbnails (interactive) */}
        <div className="md:col-span-2 md:row-start-2">
          <ProductGallery images={imageUrls} />
        </div>

        {/* Info */}
        <div className="mt-[30px] flex flex-col gap-5 md:col-start-3 md:row-start-2 md:mt-0">
          <dl className="flex justify-between type-p1">
            <div className="flex flex-col gap-0.5 text-oslo">
              {drop && <dt>Drop</dt>}
              {material && <dt>Material</dt>}
              {product.edition && <dt>Edition</dt>}
              {sizes && <dt>Size</dt>}
            </div>
            <div className="flex flex-col gap-0.5 text-right text-graphite">
              {drop && (
                <dd>
                  {product.collection?.slug ? (
                    <Link
                      href={`/collections/${product.collection.slug}`}
                      className="underline underline-offset-4 hover:text-redcurrent"
                    >
                      {drop}
                    </Link>
                  ) : (
                    drop
                  )}
                </dd>
              )}
              {material && <dd>{material}</dd>}
              {product.edition && <dd>{product.edition}</dd>}
              {sizes && <dd>{sizes}</dd>}
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
            <div>
              <P1 className="mb-[10px] font-bold">After Care</P1>
              <P1 className="whitespace-pre-line text-graphite">{product.careInstructions}</P1>
            </div>
          )}
        </div>
      </div>

      {/* Ring size chart — only relevant for rings */}
      {product.category === 'rings' && (
        <div className="mt-[60px]">
          <RingSizeChart />
        </div>
      )}
    </ShopLayout>
  );
}
