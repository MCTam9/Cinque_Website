import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { sanityFetch } from '@/lib/sanity/fetch';
import { pageBySlugQuery, pageSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';
import Container from '@/components/Container';
import { H1 } from '@/components/typography';

export const revalidate = 60;

type PageDoc = {
  title: string;
  seoDescription?: string;
  content?: PageBlock[];
};

async function getDoc(slug: string): Promise<PageDoc | null> {
  return sanityFetch<PageDoc | null>({
    label: `page:${slug}`,
    query: pageBySlugQuery,
    params: { slug },
    fallback: null,
  });
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(pageSlugsQuery);
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.error('[sanity] pageSlugs failed — no generic pages prerendered', err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);
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
  const doc = await getDoc(slug);

  if (!doc) notFound();

  return (
    <Container className="py-[40px] md:py-[60px]">
      <Link href="/" className="type-p1 mb-[20px] inline-block text-oslo hover:text-redcurrent">
        ← Home
      </Link>
      <H1 className="mb-[30px]">{doc.title}</H1>
      <PageBuilder blocks={doc.content} />
    </Container>
  );
}
