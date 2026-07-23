import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/Container';
import { H1, H2, P1 } from '@/components/typography';
import { PortableText } from '@/components/PortableText';
import { formatLabel } from '@/lib/products';
import { sanityClient } from '@/lib/sanity/client';
import { exhibitionsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import type { SanityImageRef } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Exhibition',
  description: 'Cinque® exhibitions, shows and installations.',
};

interface ExhibitionDoc {
  _id: string;
  title: string;
  slug?: string;
  venue?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: unknown;
  images?: SanityImageRef[];
  externalUrl?: string;
}

// Fallback imagery when an exhibition has no photos yet.
const STANDINS = [
  '/figma/lookbook-1-hand.png',
  '/figma/lookbook-2-bench-flatlay.png',
  '/figma/lookbook-3-macro-hallmark-bead.png',
];

function ExhImage({ src, hideOnMobile = false }: { src: string; hideOnMobile?: boolean }) {
  return (
    <div className={`group relative aspect-[2/3] w-full overflow-hidden bg-cloud/30 ${hideOnMobile ? 'max-md:hidden' : ''}`}>
      <Image src={src} alt="Cinque exhibition piece" fill sizes="(max-width: 768px) 50vw, 300px" className="img-bw object-cover" />
    </div>
  );
}

function formatMonth(iso?: string): string {
  return iso ? iso.slice(0, 7) : '';
}

function Entry({ ex, last }: { ex: ExhibitionDoc; last: boolean }) {
  const images =
    ex.images && ex.images.length
      ? ex.images
          .filter((i) => i.asset)
          .slice(0, 3)
          .map((img) => urlFor(img as never).width(600).height(900).fit('crop').url())
      : STANDINS;
  const date = [formatMonth(ex.startDate), formatMonth(ex.endDate)].filter(Boolean).join(' – ');

  return (
    <article className={last ? '' : 'mb-[60px]'}>
      {/* Header — title + venue bottom-aligned over a shared grey rule */}
      <div className="mb-[10px] grid grid-cols-1 items-end gap-x-[10px] gap-y-[10px] md:grid-cols-3">
        <H2 className="border-b border-oslo pb-[10px] md:col-span-2">
          {ex.slug ? (
            <Link href={`/exhibitions/${ex.slug}`} className="hover:text-redcurrent">
              {formatLabel(ex.title)}
            </Link>
          ) : (
            formatLabel(ex.title)
          )}
        </H2>
        <P1 className="border-b border-oslo pb-[10px] text-right text-oslo">{ex.venue || ''}</P1>
      </div>

      {/* Body — description | Date/Location, then the image columns */}
      <div className="grid grid-cols-1 gap-x-[10px] gap-y-[30px] md:grid-cols-3">
        <div className="flex flex-col gap-[20px] md:col-span-2">
          {Boolean(ex.description) && (
            <div className="type-p1 flex flex-col gap-[10px]">
              <PortableText value={ex.description as never} />
            </div>
          )}
          {ex.externalUrl && (
            <P1>
              <a
                href={ex.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-redcurrent"
              >
                Read more
              </a>
            </P1>
          )}
        </div>
        <dl className="flex h-fit justify-between gap-4 type-p1">
          <div className="flex flex-col text-oslo">
            {date && <dt>Date</dt>}
            {ex.location && <dt>Location</dt>}
          </div>
          <div className="flex flex-col text-right text-graphite">
            {date && <dd>{date}</dd>}
            {ex.location && <dd>{ex.location}</dd>}
          </div>
        </dl>
        {images.map((src, i) => (
          <ExhImage key={`${src}-${i}`} src={src} hideOnMobile={i === 2} />
        ))}
      </div>
    </article>
  );
}

export default async function ExhibitionsPage() {
  let items: ExhibitionDoc[] = [];
  try {
    items = await sanityClient.fetch<ExhibitionDoc[]>(exhibitionsQuery);
  } catch {
    items = [];
  }

  return (
    <Container className="py-[40px] md:py-[60px]">
      <H1 className="mb-[10px] border-b border-oslo pb-[10px]">EXHIBITION</H1>

      {items.length === 0 ? (
        <P1 className="text-oslo">No exhibitions listed yet. Please check back soon.</P1>
      ) : (
        items.map((ex, i) => <Entry key={ex._id} ex={ex} last={i === items.length - 1} />)
      )}
    </Container>
  );
}
