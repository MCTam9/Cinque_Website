import { notFound } from 'next/navigation';
import { sanityClient } from '@/lib/sanity/client';
import { exhibitionBySlugQuery, exhibitionSlugsQuery } from '@/lib/sanity/queries';
import { PageBuilder, type PageBlock } from '@/components/PageBuilder';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await sanityClient.fetch<string[]>(exhibitionSlugsQuery);
  return slugs.map((slug) => ({ slug }));
}

/**
 * Exhibition page — rendered from the Studio page builder.
 */
export default async function ExhibitionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await sanityClient.fetch<{
    title: string;
    venue?: string;
    location?: string;
    content?: PageBlock[];
  } | null>(exhibitionBySlugQuery, { slug });

  if (!doc) notFound();

  return (
    <main>
      <header>
        <h1>{doc.title}</h1>
        {(doc.venue || doc.location) && (
          <p>{[doc.venue, doc.location].filter(Boolean).join(', ')}</p>
        )}
      </header>
      <PageBuilder blocks={doc.content} />
    </main>
  );
}
