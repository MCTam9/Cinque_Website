import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { collectionBySlugQuery, collectionSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';
import Container from '@/components/Container';
import { H1, P2 } from '@/components/typography';

export const revalidate = 60;

interface CollectionDoc {
  title: string;
  dropNumber?: number;
  content?: PageBlock[];
}

async function getDoc(slug: string): Promise<CollectionDoc | null> {
  try {
    return await sanityClient.fetch<CollectionDoc | null>(collectionBySlugQuery, { slug });
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(collectionSlugsQuery);
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
  if (!doc) return { title: 'Collection' };
  return { title: doc.title, description: `${doc.title} — a Cinque® drop.` };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  return (
    <Container className="py-12 md:py-16">
      <header className="mb-8 flex flex-col gap-1">
        {typeof doc.dropNumber === 'number' && (
          <P2 className="text-oslo">Drop {String(doc.dropNumber).padStart(2, '0')}</P2>
        )}
        <H1 className="font-bold">{doc.title}</H1>
      </header>
      <PageBuilder blocks={doc.content} />
    </Container>
  );
}
