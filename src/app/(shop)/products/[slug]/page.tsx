import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { productBySlugQuery, productSlugsQuery } from '@/lib/sanity/queries';
import { PortableText } from '@/components/PortableText';
import type { Product } from '@/types';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await sanityClient.fetch<string[]>(productSlugsQuery);
  return slugs.map((slug) => ({ slug }));
}

/**
 * Product detail — placeholder. Data pipeline wired (product + variants +
 * Portable Text description). Swap markup for the exported Figma layout;
 * the "Add to cart" button will call useCart().addLine(...).
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await sanityClient.fetch<
    (Product & { description?: never[]; careInstructions?: string }) | null
  >(productBySlugQuery, { slug });

  if (!product) notFound();

  return (
    <main>
      <h1>{product.title}</h1>
      {/* Rich text rendered safely via Portable Text (no raw HTML injection). */}
      <PortableText value={product.description as never} />
      <section>
        <h2>Variants</h2>
        <ul>
          {product.variants?.map((v) => (
            <li key={v._key}>
              {v.sku} — {v.metalType} — £{(v.priceGBP / 100).toFixed(2)} —{' '}
              {v.stockQuantity > 0 ? 'in stock' : 'sold out'}
              {/* Replace with an add-to-cart control using useCart() */}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
