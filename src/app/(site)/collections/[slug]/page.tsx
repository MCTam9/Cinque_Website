import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { sanityFetch } from '@/lib/sanity/fetch';
import { collectionBySlugQuery, collectionSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';
import Container from '@/components/Container';
import { H1, P2 } from '@/components/typography';

export const revalidate = 60;

interface CollectionDoc {
  title: string;
  dropNumber?: number;
  lookbookDrop?: { title: string; slug: string };
  content?: PageBlock[];
}

async function getDoc(slug: string): Promise<CollectionDoc | null> {
  return sanityFetch<CollectionDoc | null>({
    label: `collection:${slug}`,
    query: collectionBySlugQuery,
    params: { slug },
    fallback: null,
  });
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityClient.fetch<string[]>(collectionSlugsQuery);
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.error('[sanity] collectionSlugs failed — no collection pages prerendered', err);
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
    <Container className="py-[40px] md:py-[60px]">
      <Link href="/shop" className="type-p1 mb-[20px] inline-block text-oslo hover:text-redcurrent">
        ← Shop
      </Link>
      <header className="mb-[30px] flex flex-col gap-1">
        {typeof doc.dropNumber === 'number' && (
          <P2 className="text-oslo">Drop {String(doc.dropNumber).padStart(2, '0')}</P2>
        )}
        <H1>{doc.title}</H1>
        {doc.lookbookDrop && (
          <Link
            href={`/lookbook?drop=${doc.lookbookDrop.slug}`}
            className="type-p1 w-fit text-oslo underline underline-offset-4 hover:text-redcurrent"
          >
            View in Lookbook
          </Link>
        )}
      </header>
      <PageBuilder blocks={doc.content} />
    </Container>
  );
}
