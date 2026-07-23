import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { productBySlugQuery, productSlugsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import { metalLabel, formatGBP } from '@/lib/products';
import { PortableText } from '@/components/PortableText';
import Container from '@/components/Container';
import { H2, P1, P2 } from '@/components/typography';
import ProductPurchase, { type PurchaseVariant } from '@/components/ProductPurchase';
import RingSizeChart from '@/components/RingSizeChart';
import type { CollectionRef, SanityImageRef, Variant } from '@/types';

export const revalidate = 60;

interface PDPProduct {
  _id: string;
  title: string;
  slug: string;
  status: string;
  description?: unknown;
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
    title: product.title,
    description: `${product.title} — Cinque®. Individually made, cast and hallmarked in London.`,
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  };
}

function variantLabel(v: Variant): string {
  return [metalLabel(v.metalType), v.size].filter(Boolean).join(' · ') || v.sku;
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
    alt: img.alt || product.title,
  }));
  const thumbUrl = images[0]?.asset
    ? urlFor(images[0] as never).width(200).url()
    : undefined;

  const purchaseVariants: PurchaseVariant[] = (product.variants ?? []).map((v) => ({
    key: v._key,
    sku: v.sku,
    label: variantLabel(v),
    priceGBP: v.priceGBP,
    inStock: v.stockQuantity > 0 || Boolean(v.allowBackorder),
  }));

  const drop =
    product.collection?.title &&
    (typeof product.collection.dropNumber === 'number'
      ? `${String(product.collection.dropNumber).padStart(2, '0')}_${product.collection.title.replace(/\s+/g, '_')}`
      : product.collection.title);
  const defaultMaterial = metalLabel(product.variants?.[0]?.metalType);
  const minPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.priceGBP))
    : 0;

  return (
    <Container className="py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 type-p2 text-oslo">
        <Link href="/shop" className="hover:text-graphite">
          Shop
        </Link>{' '}
        / <span className="text-graphite">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col gap-[10px]">
          {imageUrls.length > 0 ? (
            imageUrls.map((img, i) => (
              <div
                key={img.url}
                className="group relative aspect-[3/4] w-full overflow-hidden bg-cloud/30"
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="img-bw object-cover"
                />
              </div>
            ))
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-cloud/30 type-p2 text-oslo">
              No image
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <H2>{product.title}</H2>
            <dl className="flex gap-4 type-p2 text-oslo">
              <div className="flex flex-col gap-1">
                {drop && <dt>Drop</dt>}
                {defaultMaterial && <dt>Material</dt>}
              </div>
              <div className="flex flex-col gap-1 text-graphite">
                {drop && <dd>{drop}</dd>}
                {defaultMaterial && <dd>{defaultMaterial}</dd>}
              </div>
            </dl>
          </header>

          {purchaseVariants.length > 0 ? (
            <ProductPurchase
              productId={product._id}
              title={product.title}
              variants={purchaseVariants}
              imageUrl={thumbUrl}
            />
          ) : (
            <P1 className="text-oslo">{formatGBP(minPrice)}</P1>
          )}

          {Boolean(product.description) && (
            <div className="type-p1 flex flex-col gap-3 border-t border-oslo/50 pt-4">
              <PortableText value={product.description as never} />
            </div>
          )}

          {product.careInstructions && (
            <div className="border-t border-oslo/50 pt-4">
              <P2 className="mb-2 text-oslo">After Care</P2>
              <P2 className="whitespace-pre-line text-graphite">{product.careInstructions}</P2>
            </div>
          )}

          <RingSizeChart />
        </div>
      </div>
    </Container>
  );
}
