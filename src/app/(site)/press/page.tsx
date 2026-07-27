import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Container, { contentPadY } from '@/components/Container';
import { H1, H2, H3, P1 } from '@/components/typography';
import { PortableText } from '@/components/PortableText';
import { formatLabel } from '@/lib/products';
import { sanityFetch } from '@/lib/sanity/fetch';
import { pressQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import type { SanityImageRef } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Press',
  description: 'Cinque® press, shows and installations.',
};

interface PressDoc {
  _id: string;
  title: string;
  subtitle?: string;
  slug?: string;
  venue?: string;
  publication?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: unknown;
  images?: SanityImageRef[];
  externalUrl?: string;
}

/**
 * A press photo. `full` marks the one that spans both mobile columns (the first
 * of an entry), so its `sizes` hint matches the width it actually renders at.
 */
function ExhImage({ src, alt, full = false }: { src: string; alt: string; full?: boolean }) {
  return (
    <div className="group relative aspect-[2/3] w-full overflow-hidden bg-cloud/30">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`(max-width: 768px) ${full ? '100vw' : '50vw'}, 300px`}
        className="img-bw object-cover"
      />
    </div>
  );
}

/** Sanity `date` fields already store YYYY-MM-DD; the slice is a guard. */
function formatDay(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

function Entry({ ex, last }: { ex: PressDoc; last: boolean }) {
  // Only real uploads render — an entry with no photos shows none.
  const images = (ex.images ?? [])
    .filter((i) => i.asset)
    .slice(0, 3)
    .map((img) => ({
      src: urlFor(img as never).width(600).height(900).fit('crop').url(),
      alt: img.alt || formatLabel(ex.title),
    }));
  const date = [formatDay(ex.startDate), formatDay(ex.endDate)].filter(Boolean).join(' – ');

  const meta = (
    <dl className="flex justify-between gap-[20px] type-p1">
      <div className="flex flex-col text-oslo">
        {date && <dt>Date</dt>}
        {ex.location && <dt>Location</dt>}
      </div>
      <div className="flex flex-col text-right text-graphite">
        {date && <dd>{date}</dd>}
        {ex.location && <dd>{ex.location}</dd>}
      </div>
    </dl>
  );

  return (
    <article className={last ? '' : 'mb-[40px] md:mb-[60px]'}>
      {/* Header — title (+ venue/publication: right over a shared rule on desktop, left below on mobile) */}
      <div className="mb-[10px] grid grid-cols-1 items-end gap-x-[10px] gap-y-[10px] md:grid-cols-3">
        {/* Title and subtitle share the rule, so the subtitle sits above it. */}
        <div className="flex flex-col gap-[10px] border-b border-oslo pb-[10px] md:col-span-2">
          <H2>
            {ex.slug ? (
              <Link href={`/press/${ex.slug}`} className="hover:text-redcurrent">
                {formatLabel(ex.title)}
              </Link>
            ) : (
              formatLabel(ex.title)
            )}
          </H2>
          {ex.subtitle && <H3 className="text-graphite">{ex.subtitle}</H3>}
        </div>
        {(ex.venue || ex.publication) && (
          <P1 className="text-oslo md:border-b md:border-oslo md:pb-[10px] md:text-right">
            {[ex.venue, ex.publication].filter(Boolean).join(' · ')}
          </P1>
        )}
      </div>

      {/* Date / Location — before the copy on mobile */}
      <div className="mb-[20px] md:hidden">{meta}</div>

      <div className="grid grid-cols-1 gap-x-[10px] gap-y-[20px] md:grid-cols-3 md:gap-y-[30px]">
        {/* Description (cols 1–2) */}
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

        {/* Date / Location — col 3 on desktop */}
        <div className="hidden h-fit md:block">{meta}</div>

        {/* Images: mobile = first full + rest 2-up; desktop = 3 columns. Omitted
            entirely when there are none, so no empty row is left behind. */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-[10px] md:contents">
            {images.map((img, i) => (
              <div
                key={`${img.src}-${i}`}
                className={i === 0 ? 'col-span-2 md:col-span-1' : ''}
              >
                <ExhImage src={img.src} alt={img.alt} full={i === 0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default async function PressPage() {
  const items = await sanityFetch<PressDoc[]>({
    label: 'press',
    query: pressQuery,
    fallback: [],
  });

  return (
    <Container className={contentPadY}>
      <H1 className="mb-[10px] border-b border-oslo pb-[10px]">PRESS</H1>

      {items.length === 0 ? (
        <P1 className="text-oslo">No press listed yet. Please check back soon.</P1>
      ) : (
        items.map((ex, i) => <Entry key={ex._id} ex={ex} last={i === items.length - 1} />)
      )}
    </Container>
  );
}
