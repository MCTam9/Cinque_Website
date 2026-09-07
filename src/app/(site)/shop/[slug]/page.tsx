import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sanityFetch } from '@/lib/sanity/fetch';
import { sanityClient } from '@/lib/sanity/client';
import { productBySlugQuery, productSlugsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import { metalLabel, formatLabel } from '@/lib/products';
import ShopLayout from '@/components/ShopLayout';
import JsonLd from '@/components/JsonLd';
import { PortableText } from '@/components/PortableText';
import { H2, P1 } from '@/components/typography';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  productSeoDescription,
  productSeoTitle,
  RETURN_POLICY,
  SHIPPING,
} from '@/lib/seo';
import { categoryBy, isReservedShopSlug } from '@/lib/shop/categories';
import ProductPurchase, { type PurchaseVariant } from '@/components/ProductPurchase';
import ProductGallery from '@/components/ProductGallery';
import RingSizeChart from '@/components/RingSizeChart';
import type { PortableTextBlock } from '@portabletext/types';
import type { CollectionRef, ProductCategory, SanityImageRef, Variant } from '@/types';

// Previously `force-dynamic`, because JsonLd read the CSP nonce via
// next/headers() and that dynamic API conflicted with generateStaticParams
// (DYNAMIC_SERVER_USAGE, 500s on Vercel). JsonLd no longer reads headers at
// all — see the note in that component — so this route can prerender again.
export const revalidate = 60;

interface PDPProduct {
  _id: string;
  title: string;
  slug: string;
  status: string;
  category?: ProductCategory;
  edition?: string;
  description?: PortableTextBlock[];
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product' };

  const first = product.images?.[0];
  // 1200x630 is the card size social platforms actually crop to; the previous
  // 1200x1200 square was letterboxed everywhere.
  const ogImage = first?.asset
    ? urlFor(first as never).width(1200).height(630).fit('crop').url()
    : undefined;
  const title = productSeoTitle(product);
  const description = productSeoDescription(product);
  const canonical = `/shop/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    // Products that are not live are still routable by slug. Keep them out of
    // the index rather than letting unfinished pages accumulate.
    ...(product.status === 'active' ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    // Without this Twitter/X falls back to no image at all.
    ...(ogImage ? { twitter: { card: 'summary_large_image', images: [ogImage] } } : {}),
  };
}

/**
 * Prerender the catalog. Mirrors the press/[slug] pattern: a Sanity outage at
 * build time degrades to on-demand rendering rather than failing the build.
 * Reserved slugs are filtered out — a category route of the same name would
 * win, so emitting one here would produce a static file that shadows it.
 */
export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(productSlugsQuery);
    return slugs.filter((s) => !isReservedShopSlug(s)).map((slug) => ({ slug }));
  } catch (err) {
    console.error('[sanity] productSlugs failed — no product pages prerendered', err);
    return [];
  }
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
  // Category routes (/shop/rings) are literal segments and win over this one,
  // so a product with such a slug is unreachable; 404 rather than half-render.
  if (isReservedShopSlug(slug)) notFound();
  // `status` is an ordinary field, not a Sanity draft, so `perspective:
  // 'published'` does not hide unfinished products. Without this a draft or
  // archived piece renders a complete, crawlable page.
  if (product.status === 'draft' || product.status === 'archived') notFound();

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
    (product.collection.dropNumber
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
  const maxPrice = product.variants?.length
    ? Math.max(...product.variants.map((v) => v.priceGBP))
    : 0;

  return (
    <ShopLayout active={product.category ?? 'all'} filterable titleHref="/shop" titleAs="p">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          '@id': absoluteUrl(`/shop/${product.slug}`),
          url: absoluteUrl(`/shop/${product.slug}`),
          name: formatLabel(product.title),
          image: imageUrls.map((i) => i.url),
          // Real editorial copy where it exists, not the old fixed template
          // that made every product in the catalog identical.
          description: productSeoDescription(product),
          brand: { '@type': 'Brand', name: 'Cinque' },
          ...(material ? { material } : {}),
          ...(product.category ? { category: categoryBy(product.category).label } : {}),
          ...(product.variants?.[0]?.metalFinish
            ? { color: product.variants[0].metalFinish }
            : {}),
          // One Offer per variant: each SKU has its own price and stock, which
          // a single aggregate Offer hid entirely.
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'GBP',
            lowPrice: (minPrice / 100).toFixed(2),
            highPrice: (maxPrice / 100).toFixed(2),
            offerCount: purchaseVariants.length,
            offers: purchaseVariants.map((v) => ({
              '@type': 'Offer',
              sku: v.sku,
              name: v.label,
              priceCurrency: 'GBP',
              price: (v.priceGBP / 100).toFixed(2),
              availability: v.inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              itemCondition: 'https://schema.org/NewCondition',
              url: absoluteUrl(`/shop/${product.slug}`),
              // Mirrors the published terms at /shipping. Keep the two in step:
              // Google treats a mismatch as a merchant listing violation.
              hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                applicableCountry: RETURN_POLICY.country,
                returnPolicyCategory:
                  'https://schema.org/MerchantReturnFiniteReturnWindow',
                merchantReturnDays: RETURN_POLICY.days,
                returnMethod: 'https://schema.org/ReturnByMail',
                returnFees: RETURN_POLICY.returnFeesCustomerResponsibility
                  ? 'https://schema.org/ReturnShippingFees'
                  : 'https://schema.org/FreeReturn',
              },
              shippingDetails: {
                '@type': 'OfferShippingDetails',
                shippingDestination: SHIPPING.countries.map((c) => ({
                  '@type': 'DefinedRegion',
                  addressCountry: c,
                })),
                deliveryTime: {
                  '@type': 'ShippingDeliveryTime',
                  handlingTime: {
                    '@type': 'QuantitativeValue',
                    minValue: SHIPPING.handlingDaysMin,
                    maxValue: SHIPPING.handlingDaysMax,
                    unitCode: 'DAY',
                  },
                },
              },
            })),
          },
        }}
      />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          ...(product.category
            ? [
                {
                  name: categoryBy(product.category).label,
                  path: `/shop/${product.category}`,
                },
              ]
            : []),
          { name: formatLabel(product.title), path: `/shop/${product.slug}` },
        ])}
      />

      {/* Product layout: title over gallery (2/3) + info (1/3) */}
      <div className="grid grid-cols-1 gap-x-[10px] md:grid-cols-3">
        {/* Title row */}
        {/* The page's single <h1>: the product itself, not the word SHOP.
            `as` keeps the existing H2 styling while fixing the element. */}
        <H2 as="h1" className="mb-[10px] border-b border-oslo pb-[10px] md:col-span-2">
          {formatLabel(product.title)}
        </H2>
        <div className="mb-[10px] hidden border-b border-oslo md:col-start-3 md:block" />

        {/* Gallery: main image + clickable thumbnails (interactive) */}
        <div className="md:col-span-2 md:row-start-2">
          <ProductGallery images={imageUrls} />
        </div>

        {/* Info */}
        <div className="mt-[30px] flex flex-col gap-[20px] md:col-start-3 md:row-start-2 md:mt-0">
          {/* The CMS description. Queried since day one but never rendered,
              which left the PDP with no prose for search engines to read. */}
          {product.description && (
            <div className="type-p1 flex flex-col gap-[10px] text-graphite">
              <PortableText value={product.description} />
            </div>
          )}

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
        <div className="mt-[40px] md:mt-[60px]">
          <RingSizeChart />
        </div>
      )}
    </ShopLayout>
  );
}
