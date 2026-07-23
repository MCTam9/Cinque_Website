import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { exhibitionBySlugQuery, exhibitionSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

export const revalidate = 60;

interface ExhibitionDoc {
  title: string;
  venue?: string;
  location?: string;
  description?: string;
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
  return { title: doc.title, description: doc.description ?? undefined };
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
    <Container className="py-12 md:py-16">
      <header className="mb-8 flex flex-col gap-2">
        <H1>{doc.title}</H1>
        {(doc.venue || doc.location) && (
          <P1 className="text-oslo">{[doc.venue, doc.location].filter(Boolean).join(', ')}</P1>
        )}
        {doc.description && <P1 className="mt-4 max-w-2xl">{doc.description}</P1>}
      </header>
      <PageBuilder blocks={doc.content} />
    </Container>
  );
}
