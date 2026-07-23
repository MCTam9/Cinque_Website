import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { exhibitionBySlugQuery, exhibitionSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';
import { PortableText } from '@/components/PortableText';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';
import { formatLabel } from '@/lib/products';

export const revalidate = 60;

interface ExhibitionDoc {
  title: string;
  venue?: string;
  location?: string;
  description?: unknown;
  content?: PageBlock[];
}

async function getDoc(slug: string): Promise<ExhibitionDoc | null> {
  try {
    return await sanityClient.fetch<ExhibitionDoc | null>(exhibitionBySlugQuery, { slug });
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(exhibitionSlugsQuery);
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
  const doc = await getDoc(slug);
  if (!doc) return { title: 'Exhibition' };
  return {
    title: formatLabel(doc.title),
    description: `${formatLabel(doc.title)} — a Cinque® exhibition${doc.venue ? ` at ${doc.venue}` : ''}.`,
  };
}

export default async function ExhibitionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  return (
    <Container className="py-[40px] md:py-[60px]">
      <header className="mb-[30px] flex flex-col gap-[10px]">
        <H1>{formatLabel(doc.title)}</H1>
        {(doc.venue || doc.location) && (
          <P1 className="text-oslo">{[doc.venue, doc.location].filter(Boolean).join(', ')}</P1>
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
