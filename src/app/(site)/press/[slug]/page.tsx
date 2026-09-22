import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { sanityFetch } from '@/lib/sanity/fetch';
import { pressBySlugQuery, pressSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';
import { PressEntry, type PressEntryDoc } from '@/components/PressEntry';
import Container, { contentPadY } from '@/components/Container';
import { formatLabel } from '@/lib/products';
import JsonLd from '@/components/JsonLd';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 60;

interface PressDoc extends PressEntryDoc {
  content?: PageBlock[];
}

async function getDoc(slug: string): Promise<PressDoc | null> {
  return sanityFetch<PressDoc | null>({
    label: `press:${slug}`,
    query: pressBySlugQuery,
    params: { slug },
    fallback: null,
  });
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(pressSlugsQuery);
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.error('[sanity] pressSlugs failed — no press pages prerendered', err);
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
  if (!doc) return { title: 'Press' };
  return {
    title: formatLabel(doc.title),
    description: `${formatLabel(doc.title)} — Cinque® press${
      doc.venue ? ` at ${doc.venue}` : doc.publication ? `, ${doc.publication}` : ''
    }.`,
    alternates: { canonical: `/press/${slug}` },
  };
}

export default async function PressDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  return (
    <Container className={contentPadY}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: formatLabel(doc.title),
          ...(doc.startDate ? { datePublished: doc.startDate } : {}),
          ...(doc.subtitle ? { description: doc.subtitle } : {}),
          author: { '@id': absoluteUrl('/#organization') },
          publisher: { '@id': absoluteUrl('/#organization') },
          mainEntityOfPage: absoluteUrl(`/press/${slug}`),
          ...(doc.location ? { locationCreated: doc.location } : {}),
        }}
      />
      <Link
        href="/press"
        className="type-p1 mb-[20px] inline-block text-oslo hover:text-redcurrent"
      >
        ← Press
      </Link>
      {/* Same entry as on the Press list, with every photo rather than the
          first three. Most entries have no page-builder content, so without
          this the page was just a title. */}
      <PressEntry
        ex={doc}
        titleAs="h1"
        className={doc.content?.length ? 'mb-[40px] md:mb-[60px]' : ''}
      />
      <PageBuilder blocks={doc.content} />
    </Container>
  );
}
