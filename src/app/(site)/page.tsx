import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Container, { contentPadY } from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import { H1, P1 } from '@/components/typography';
import { formatLabel } from '@/lib/products';
import { sanityFetch } from '@/lib/sanity/fetch';
import { homePageQuery, lookbookDropsQuery, pressLinksQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import HomeSectionMedia, { type MediaImage } from '@/components/HomeSectionMedia';
import type { HomePageDoc, LookbookDrop, SanityImageRef } from '@/types';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Default tagline, shown until one is set in Sanity.
const DEFAULT_TAGLINE =
  'Jewellery and object maker.\nSealing memories into a tactile archive.\nIndividually made, cast and hallmarked in London.';

// Default drop list, used only when no Lookbook Drops exist in Sanity yet.
const DEFAULT_DROPS = [
  '04_Lost_Garden',
  '03_Hastata',
  '02_Shell_Relic',
  '01_Metal_Veil',
  '00_Archive',
];

// Each Home section = a heading + section imagery, linking to its page.
// `imageKey` is the Sanity array field; `img` is the built-in Figma fallback
// strip (shown until images are uploaded).
const SECTIONS = [
  { href: '/shop', label: 'SHOP', imageKey: 'shopImages', img: '/figma/home-shop.png', w: 1800, h: 653 },
  { href: '/lookbook', label: 'LOOKBOOK', imageKey: 'lookbookImages', img: '/figma/home-lookbook.png', w: 1800, h: 516, drops: true },
  { href: '/press', label: 'PRESS', imageKey: 'pressImages', img: '/figma/home-exhibition.png', w: 1800, h: 652 },
  { href: '/studio', label: 'STUDIO', imageKey: 'studioImages', img: '/figma/home-studio.png', w: 1800, h: 652 },
] as const;

type DropLink = { slug: string; label: string; cover?: SanityImageRef };

type PressLink = { _id: string; title: string; slug?: string };

/** Sanity CDN URL at the 2:3 crop every home card renders in. */
function imageUrl(img: SanityImageRef): string {
  return urlFor(img as never).width(600).height(900).fit('crop').url();
}

/**
 * LOOKBOOK cards: each drop title travels with its own cover image so the two
 * scroll as one, instead of a row of titles the reader has to match up against
 * a separate row of pictures.
 *
 * Pairing is positional — the Home Page's LOOKBOOK images are uploaded newest
 * drop first, the order `dropLinks` already comes back in. Reordering either
 * list in the Studio therefore re-pairs them. A drop with no Home cover falls
 * back to its own first lookbook image; extra Home images beyond the drop list
 * still render, just without a title.
 */
function lookbookCards(
  images: SanityImageRef[] | undefined,
  dropLinks: DropLink[]
): MediaImage[] {
  const cards: MediaImage[] = dropLinks.flatMap((d, i) => {
    const img = images?.[i] ?? d.cover;
    if (!img) return [];
    return [
      {
        url: imageUrl(img),
        alt: img.alt || `${d.label} — Cinque`,
        label: d.label,
        href: `/lookbook?drop=${d.slug}`,
      },
    ];
  });

  for (const img of images?.slice(dropLinks.length) ?? []) {
    cards.push({ url: imageUrl(img), alt: img.alt || 'LOOKBOOK — Cinque' });
  }

  return cards;
}

/**
 * PRESS cards: each image links to its own entry on the Press page
 * (/press#slug) rather than to the top of it, so the reader lands on the piece
 * they clicked.
 *
 * Pairing is positional, as on LOOKBOOK — the Home Page's PRESS images are
 * uploaded newest entry first, the order `pressLinks` comes back in. An image
 * with no entry beside it (or an entry with no slug) still links to /press.
 */
function pressCards(
  images: SanityImageRef[] | undefined,
  pressLinks: PressLink[]
): MediaImage[] {
  return (images ?? []).map((img, i) => {
    const entry = pressLinks[i];
    return {
      url: imageUrl(img),
      alt: img.alt || `${entry ? formatLabel(entry.title) : 'PRESS'} — Cinque`,
      href: entry?.slug ? `/press#${entry.slug}` : undefined,
      linkLabel: entry ? formatLabel(entry.title) : undefined,
    };
  });
}

export default async function HomePage() {
  const [home, drops, pressLinks] = await Promise.all([
    sanityFetch<HomePageDoc | null>({
      label: 'homePage',
      query: homePageQuery,
      fallback: null,
    }),
    sanityFetch<LookbookDrop[]>({
      label: 'lookbookDrops',
      query: lookbookDropsQuery,
      fallback: [],
    }),
    sanityFetch<PressLink[]>({
      label: 'pressLinks',
      query: pressLinksQuery,
      fallback: [],
    }),
  ]);

  const tagline = home?.tagline?.trim() || DEFAULT_TAGLINE;
  const taglineLines = tagline.split('\n');

  // Drop links for the LOOKBOOK section: from Sanity, or the built-in defaults.
  const dropLinks =
    drops.length > 0
      ? drops.map((d) => ({
          slug: d.slug,
          label: d.dropNumber ? `${d.dropNumber}/${d.title}` : d.title,
          // Used only if the Home Page has no cover uploaded for this drop.
          cover: d.images?.find((i) => i.asset),
        }))
      : DEFAULT_DROPS.map((slug) => ({
          slug,
          label: formatLabel(slug),
          cover: undefined as SanityImageRef | undefined,
        }));

  return (
    <Container className={contentPadY}>
      {/* The page's single real heading; the logo below is decorative. */}
      <h1 className="sr-only">Cinque</h1>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Cinque',
          url: siteUrl,
          description:
            'Jewellery and object maker. Individually made, cast and hallmarked in London.',
          sameAs: ['https://www.instagram.com/cinque.made'],
        }}
      />

      {/* Hero: logo left, tagline vertically centred with it */}
      <section className="mb-[40px] flex flex-col gap-[30px] md:mb-[60px] md:flex-row md:items-center md:justify-between">
        {/* A local SVG, so there is nothing for next/image to optimise — same
            reasoning as the wordmark in Nav. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/cinque-logo.svg"
          alt=""
          width={351}
          height={96}
          className="hidden h-auto w-[260px] md:block md:w-[351px]"
        />
        <P1 className="text-oslo md:text-right">
          {taglineLines.map((line, i) => (
            <Fragment key={i}>
              {line}
              {i < taglineLines.length - 1 && <br />}
            </Fragment>
          ))}
        </P1>
      </section>

      {/* Sections */}
      <div className="flex flex-col gap-[40px] md:gap-[60px]">
        {SECTIONS.map((s) => {
          const cmsImages = (home?.[s.imageKey as keyof HomePageDoc] as
            | SanityImageRef[]
            | undefined
          )?.filter((i) => i.asset);

          const isLookbook = 'drops' in s && s.drops;

          const mediaImages: MediaImage[] = isLookbook
            ? lookbookCards(cmsImages, dropLinks)
            : s.href === '/press'
              ? pressCards(cmsImages, pressLinks)
              : (cmsImages ?? []).map((i) => ({
                  url: imageUrl(i),
                  alt: i.alt || `${s.label} — Cinque`,
                }));

          // Media: CMS gallery (a grid, capped at 4 images on mobile / 5 on
          // desktop) if uploaded, else the built-in Figma fallback strip (a
          // single image linking to the page).
          const media =
            mediaImages.length > 0 ? (
              <HomeSectionMedia images={mediaImages} href={s.href} sectionLabel={s.label} />
            ) : (
              <Link href={s.href} aria-label={s.label}>
                <Image
                  src={s.img}
                  alt={`${s.label} — Cinque`}
                  width={s.w}
                  height={s.h}
                  sizes="(max-width: 768px) 100vw, 900px"
                  className="h-auto w-full transition-opacity hover:opacity-90"
                  priority={s.label === 'SHOP'}
                />
              </Link>
            );

          return (
            <section key={s.href}>
              <Link href={s.href}>
                <H1 as="h2" className="mb-[10px] border-b border-oslo pb-[10px] hover:text-redcurrent">
                  {s.label}
                </H1>
              </Link>

              {/* LOOKBOOK's per-drop links are no longer a separate row: each
                  drop title sits on its own card above its cover image (see
                  `lookbookCards`). Mobile shows the covers only. */}
              {media}
            </section>
          );
        })}
      </div>
    </Container>
  );
}
