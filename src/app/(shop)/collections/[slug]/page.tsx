import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { collectionBySlugQuery, collectionSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await sanityClient.fetch<string[]>(collectionSlugsQuery);
  return slugs.map((slug) => ({ slug }));
}

/**
 * Drop / collection landing page — rendered from the Studio page builder.
 * Staff add hero/image-text/gallery blocks; this template renders them.
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await sanityClient.fetch<{
    title: string;
    dropNumber?: string;
    content?: PageBlock[];
  } | null>(collectionBySlugQuery, { slug });

  if (!doc) notFound();

  return (
    <main>
      {/* Replace this header with the Figma drop-header component if desired. */}
      <header>
        <h1>{doc.title}</h1>
        {doc.dropNumber && <p>Drop {doc.dropNumber}</p>}
      </header>
      <PageBuilder blocks={doc.content} />
    </main>
  );
}
