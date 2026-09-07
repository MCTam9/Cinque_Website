import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { sanityFetch } from '@/lib/sanity/fetch';
import { pressBySlugQuery, pressSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';
import { PortableText } from '@/components/PortableText';
import Container, { contentPadY } from '@/components/Container';
import { H1, H3, P1 } from '@/components/typography';
import { formatLabel } from '@/lib/products';
import JsonLd from '@/components/JsonLd';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 60;

interface PressDoc {
  title: string;
  subtitle?: string;
  venue?: string;
  publication?: string;
  location?: string;
  startDate?: string;
  description?: unknown;
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
      <header className="mb-[30px] flex flex-col gap-[10px]">
        <H1>{formatLabel(doc.title)}</H1>
        {doc.subtitle && <H3 className="text-graphite">{doc.subtitle}</H3>}
        {(doc.venue || doc.publication || doc.location) && (
          <P1 className="text-oslo">
            {[doc.venue, doc.publication, doc.location].filter(Boolean).join(', ')}
          </P1>
        )}
        {Boolean(doc.description) && (
          <div className="type-p1 mt-[10px] flex max-w-2xl flex-col gap-[10px]">
            <PortableText value={doc.description as never} />
          </div>
        )}
      </header>
      <PageBuilder blocks={doc.content} />
    </Container>
  );
}
