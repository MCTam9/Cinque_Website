import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { contentPadY, shellGrid } from '@/components/Container';
import { H2, H3, P1, P2 } from '@/components/typography';
import { PortableText } from '@/components/PortableText';
import { formatLabel } from '@/lib/products';
import LookbookHeader, { type DropLink } from '@/components/LookbookHeader';
import { sanityFetch } from '@/lib/sanity/fetch';
import { lookbookDropsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import type { LookbookDrop, SanityImageRef } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Lookbook',
  description: 'Cinque® drops and the studio archive — one-of-a-kind and limited objects.',
};

// Built-in imagery / copy used when no drops have been added in Sanity yet, so
// the page always renders (mirrors the Press page's stand-in pattern).
const HAND = '/figma/lookbook-1-hand.png';
const BENCH = '/figma/lookbook-2-bench-flatlay.png';
const MACRO = '/figma/lookbook-3-macro-hallmark-bead.png';
const FALLBACK_IMAGES = [HAND, MACRO, BENCH, HAND, BENCH, MACRO, HAND];
const FALLBACK_SLUGS = [
  '00_Archive',
  '01_Metal_Veil',
  '02_Shell_Relic',
  '03_Hastata',
  '04_Lost_Garden',
];

// The default archive copy, shown for a drop that has no intro of its own.
function FallbackIntro() {
  return (
    <>
      <P1>
        Pieces held within the cloud of Cinque’s studio archive—one-of-a-kind and limited
        objects not assigned to any formal collection.
      </P1>
      <P1>
        All Cinque® pieces are individually made, cast and hallmarked (for silver and
        carat-gold items only) in London. Due to the handmade nature, each piece is unique
        and no exact replicas are produced.
      </P1>
      <P1>
        <Link href="/studio#contact" className="underline underline-offset-4 hover:text-redcurrent">
          Contact us
        </Link>{' '}
        to request a custom variation of an existing design. Further details regarding
        timeline and quotation will follow.
      </P1>
    </>
  );
}

type NormDrop = {
  slug: string;
  label: string;
  intro?: unknown;
  images: { src: string; alt: string }[];
};

function imgUrl(img: SanityImageRef): string {
  return urlFor(img as never).width(600).height(900).fit('crop').url();
}

/** Normalize CMS drops, or fall back to the built-in archive when there are none. */
function toNormDrops(cms: LookbookDrop[]): NormDrop[] {
  if (cms.length > 0) {
    return cms.map((d) => ({
      slug: d.slug,
      label: d.dropNumber ? `${d.dropNumber}/${d.title}` : d.title,
      intro: d.intro,
      images: (d.images ?? [])
        .filter((i) => i.asset)
        .map((i) => ({ src: imgUrl(i), alt: i.alt || d.title })),
    }));
  }
  return FALLBACK_SLUGS.map((slug) => ({
    slug,
    label: formatLabel(slug),
    images: FALLBACK_IMAGES.map((src) => ({ src, alt: 'Cinque piece' })),
  }));
}

/**
 * A lookbook photo. The featured image is full-width on mobile; every other one
 * sits in a 2- or 3-up grid, so `sizes` follows the width it renders at.
 */
function LbImage({
  src,
  alt,
  mobileWidth = '50vw',
}: {
  src: string;
  alt: string;
  mobileWidth?: '100vw' | '50vw';
}) {
  return (
    <div className="group relative aspect-[2/3] w-full overflow-hidden bg-cloud/30">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`(max-width: 768px) ${mobileWidth}, 300px`}
        className="img-bw object-cover"
      />
    </div>
  );
}

export default async function LookbookPage({
  searchParams,
}: {
  searchParams: Promise<{ drop?: string }>;
}) {
  const cms = await sanityFetch<LookbookDrop[]>({
    label: 'lookbookDrops',
    query: lookbookDropsQuery,
    fallback: [],
  });

  const drops = toNormDrops(cms ?? []);
  const dropLinks: DropLink[] = drops.map((d) => ({ slug: d.slug, label: d.label }));

  const { drop } = await searchParams;
  const idx = Math.max(0, drops.findIndex((d) => d.slug === drop));
  const activeIdx = drop && idx >= 0 ? idx : 0;
  const activeDrop = drops[activeIdx];
  const prev = activeIdx > 0 ? drops[activeIdx - 1] : null;
  const next = activeIdx < drops.length - 1 ? drops[activeIdx + 1] : null;

  // First image is featured; the rest fill the grid below it.
  const [featured, ...rest] = activeDrop?.images ?? [];

  // Title runs on one line at every breakpoint ("Drop 04/Lost Garden"). Long
  // titles wrap naturally — the base layer's overflow-wrap on headings handles
  // narrow phones rather than a forced break at the drop number.
  const label = activeDrop?.label ?? '';

  return (
    <div className={`${shellGrid} ${contentPadY}`}>
      {/* Rule above sidebar */}
      <div className="hidden border-b border-oslo md:col-start-1 md:row-start-1 md:block" />

      {/* Header + rule (mobile: SHOW ALL / HIDE drop row below the title) */}
      <LookbookHeader drops={dropLinks} active={activeDrop?.slug ?? ''} />

      {/* Drop sidebar (desktop only) */}
      <aside className="hidden pt-[10px] md:col-start-1 md:row-start-2 md:block md:pr-4">
        <P2 className="mb-[10px] text-oslo">DROP</P2>
        <ul className="flex flex-col gap-[10px]">
          {drops.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/lookbook?drop=${d.slug}`}
                className={`type-h3 transition-colors ${
                  d.slug === activeDrop?.slug
                    ? 'text-redcurrent underline underline-offset-4'
                    : 'text-graphite hover:text-redcurrent'
                }`}
              >
                {d.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editorial content */}
      <div className="pt-[10px] md:col-start-2 md:row-start-2">
        <H2 className="mb-[10px] border-b border-oslo pb-[10px]">Drop {label}</H2>

        {/* Row 1: copy + up to two images | featured image. On mobile these
            stack, so they take the 20px text↔image spacing used elsewhere; from
            md up the 10px grid gutter applies. */}
        <div className="mb-[10px] grid grid-cols-1 gap-[20px] md:grid-cols-2 md:gap-[10px]">
          <div className="flex flex-col gap-[20px] md:gap-[10px]">
            <div className="flex flex-col gap-[20px] type-p1">
              {activeDrop?.intro ? (
                <PortableText value={activeDrop.intro as never} />
              ) : (
                <FallbackIntro />
              )}
            </div>
            {rest.length > 0 && (
              // Desktop: push the pair to the bottom so it aligns with the
              // hero image on the right.
              <div className="grid grid-cols-2 gap-[10px] md:mt-auto">
                {rest.slice(0, 2).map((img, i) => (
                  <LbImage key={`a-${i}`} src={img.src} alt={img.alt} />
                ))}
              </div>
            )}
          </div>
          {/* featured image — shown first on mobile, right column on desktop */}
          {featured && (
            <div className="order-first md:order-none">
              <LbImage src={featured.src} alt={featured.alt} mobileWidth="100vw" />
            </div>
          )}
        </div>

        {/* Remaining images fill a grid */}
        {rest.length > 2 && (
          <div className="mb-[30px] grid grid-cols-2 gap-[10px] md:grid-cols-3">
            {rest.slice(2).map((img, i) => (
              <LbImage key={`b-${i}`} src={img.src} alt={img.alt} />
            ))}
          </div>
        )}

        {/* Pagination between drops — both ends carry the drop title */}
        <nav className="flex items-center justify-between border-t border-graphite pt-[20px]">
          {prev ? (
            <Link href={`/lookbook?drop=${prev.slug}`}>
              <H3 className="font-bold hover:text-redcurrent">&lt; {prev.label}</H3>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/lookbook?drop=${next.slug}`}>
              <H3 className="font-bold hover:text-redcurrent">{next.label} &gt;</H3>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  );
}
