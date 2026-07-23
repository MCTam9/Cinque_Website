import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/Container';
import { H1, P1, P2 } from '@/components/typography';
import { sanityClient } from '@/lib/sanity/client';
import { collectionsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import type { SanityImageRef } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Lookbook',
  description:
    'Cinque® drops and the studio archive — one-of-a-kind and limited objects.',
};

interface CollectionListItem {
  _id: string;
  title: string;
  slug: string;
  dropNumber?: number;
  heroImage?: SanityImageRef;
}

export default async function LookbookPage() {
  let collections: CollectionListItem[] = [];
  try {
    collections = await sanityClient.fetch<CollectionListItem[]>(collectionsQuery);
  } catch {
    collections = [];
  }

  return (
    <Container className="py-12 md:py-16">
      <header className="mb-8 flex flex-col gap-2">
        <H1 className="font-bold">LOOKBOOK</H1>
        <P1 className="max-w-xl text-oslo">
          Pieces held within the cloud of Cinque’s studio archive—one-of-a-kind and limited
          objects not assigned to any formal collection.
        </P1>
      </header>

      {collections.length === 0 ? (
        <P1 className="text-oslo">No drops published yet. Please check back soon.</P1>
      ) : (
        <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2 md:grid-cols-3">
          {collections.map((c) => {
            const img = c.heroImage?.asset
              ? urlFor(c.heroImage as never).width(616).height(824).fit('crop').url()
              : undefined;
            const label =
              typeof c.dropNumber === 'number'
                ? `${String(c.dropNumber).padStart(2, '0')}_${c.title.replace(/\s+/g, '_')}`
                : c.title;
            return (
              <Link key={c._id} href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-cloud/30">
                  {img ? (
                    <Image
                      src={img}
                      alt={c.heroImage?.alt || c.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="img-bw object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center type-p2 text-oslo">
                      {label}
                    </div>
                  )}
                </div>
                <P2 className="mt-2 group-hover:text-redcurrent">{label}</P2>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
