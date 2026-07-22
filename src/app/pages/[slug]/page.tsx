import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { pageBySlugQuery, pageSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await sanityClient.fetch<string[]>(pageSlugsQuery);
  return slugs.map((slug) => ({ slug }));
}

type PageDoc = {
  title: string;
  seoDescription?: string;
  content?: PageBlock[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await sanityClient.fetch<PageDoc | null>(pageBySlugQuery, { slug });
  if (!doc) return {};
  return { title: doc.title, description: doc.seoDescription };
}

/**
 * Generic composable page (About, Stockists, etc.) at /pages/<slug>.
 * Only pages marked "Visible on site" resolve.
 */
export default async function GenericPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await sanityClient.fetch<PageDoc | null>(pageBySlugQuery, { slug });

  if (!doc) notFound();

  return (
    <main>
      <PageBuilder blocks={doc.content} />
    </main>
  );
}
