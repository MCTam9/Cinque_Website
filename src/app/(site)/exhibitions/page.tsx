import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/Container';
import { H1, H3, P1, P2 } from '@/components/typography';
import { sanityClient } from '@/lib/sanity/client';
import { exhibitionsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import type { SanityImageRef } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Exhibition',
  description: 'Cinque® exhibitions, shows and installations.',
};

interface ExhibitionListItem {
  _id: string;
  title: string;
  slug?: string;
  venue?: string;
  location?: string;
  startDate?: string;
  images?: SanityImageRef[];
  externalUrl?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  // Keep the brand's YYYY-MM style.
  return iso.slice(0, 7);
}

export default async function ExhibitionsPage() {
  let items: ExhibitionListItem[] = [];
  try {
    items = await sanityClient.fetch<ExhibitionListItem[]>(exhibitionsQuery);
  } catch {
    items = [];
  }

  return (
    <Container className="py-12 md:py-16">
      <H1 className="mb-8 font-bold">EXHIBITION</H1>

      {items.length === 0 ? (
        <P1 className="text-oslo">No exhibitions listed yet. Please check back soon.</P1>
      ) : (
        <ul className="flex flex-col divide-y divide-oslo/40 border-y border-oslo/40">
          {items.map((ex) => {
            const img = ex.images?.[0]?.asset
              ? urlFor(ex.images[0] as never).width(600).height(450).fit('crop').url()
              : undefined;
            const inner = (
              <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-8">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-cloud/30 sm:w-64">
                  {img && (
                    <Image
                      src={img}
                      alt={ex.images?.[0]?.alt || ex.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 256px"
                      className="img-bw object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <H3 className="font-bold">{ex.title}</H3>
                  <P2 className="text-oslo">
                    {[formatDate(ex.startDate), ex.venue, ex.location].filter(Boolean).join(' · ')}
                  </P2>
                </div>
              </div>
            );
            return (
              <li key={ex._id}>
                {ex.slug ? (
                  <Link href={`/exhibitions/${ex.slug}`} className="group block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
