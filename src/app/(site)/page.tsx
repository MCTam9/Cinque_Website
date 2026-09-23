import { Fragment } from 'react';
import Link from 'next/link';
import Container, { contentPadY } from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import { H1, P1 } from '@/components/typography';
import { formatLabel } from '@/lib/products';
import { sanityFetch } from '@/lib/sanity/fetch';
import { homePageQuery, lookbookDropsQuery, pressCardsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import { organizationJsonLd, siteUrl } from '@/lib/seo';
import HomeSectionMedia, { type MediaImage } from '@/components/HomeSectionMedia';
import type { HomePageDoc, LookbookDrop, PressCard, SanityImageRef } from '@/types';

export const revalidate = 60;

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
// `imageKey` is the Sanity array field on the Home Page document. LOOKBOOK and
// PRESS have no such field — their cards come from the drops and press entries
// themselves, so the picture and the title can never drift apart. A section
// with nothing uploaded shows its heading alone; no image is substituted in.
const SECTIONS = [
  { href: '/shop', label: 'SHOP', imageKey: 'shopImages', priority: true },
  { href: '/lookbook', label: 'LOOKBOOK', drops: true },
  { href: '/press', label: 'PRESS' },
  { href: '/studio', label: 'STUDIO', imageKey: 'studioImages' },
] as const;

type DropLink = { id: string; slug: string; label: string; cover?: SanityImageRef };

/** Sanity CDN URL at the 2:3 crop every home card renders in. */
function imageUrl(img: SanityImageRef): string {
  return urlFor(img as never).width(600).height(900).fit('crop').url();
}

/**
 * Which items a Home section shows, and in what order, from its Home Page list
 * (`order`, ids). An item left out of the list is hidden — unless the Studio
 * has never offered it (not in `seen`): that one was created since anyone last
 * opened the Home Page, and it goes first, as the newest. With no list at all,
 * everything shows in `items` order (newest first). See SyncedOrderInput.
 */
function homeOrder<T extends { id: string }>(
  items: T[],
  order: string[] | undefined,
  seen: string[] | undefined
): T[] {
  if (!order?.length) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  // Before the seen list existed nothing counts as new: only the list shows.
  const unseen = seen ? items.filter((d) => !rank.has(d.id) && !seen.includes(d.id)) : [];
  const listed = items
    .filter((d) => rank.has(d.id))
    .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...unseen, ...listed];
}

/**
 * LOOKBOOK cards: one per drop, each showing that drop's own Hero Image (or its
 * first Lookbook image) under its own title — both set in Editorial → Drops, so
 * a picture can never carry another drop's name. A drop with no image gets no
 * card.
 */
function lookbookCards(home: HomePageDoc | null, dropLinks: DropLink[]): MediaImage[] {
  return homeOrder(dropLinks, home?.lookbookOrder, home?.lookbookSeen).flatMap((d) => {
    if (!d.cover) return [];
    return [
      {
        url: imageUrl(d.cover),
        alt: d.cover.alt || `${d.label} — Cinque`,
        label: d.label,
        href: `/lookbook?drop=${d.slug}`,
      },
    ];
  });
}

/**
 * PRESS cards: one per press entry, each showing that entry's own first image
 * under its own title, and linking to that entry on the Press page
 * (/press#slug) so the reader lands on the piece they clicked. Which entries
 * show, and their order, is set on the Home Page like LOOKBOOK. An entry with
 * no image gets no card — the Home page never stands in a picture of its own
 * choosing.
 */
function pressCards(home: HomePageDoc | null, entries: PressCard[]): MediaImage[] {
  const items = entries.map((e) => ({ ...e, id: e._id }));
  return homeOrder(items, home?.pressOrder, home?.pressSeen).flatMap((entry) => {
    if (!entry.cover) return [];
    const label = formatLabel(entry.title);
    return [
      {
        url: imageUrl(entry.cover),
        alt: entry.cover.alt || `${label} — Cinque`,
        label,
        href: `/press#${entry.slug}`,
      },
    ];
  });
}

export default async function HomePage() {
  const [home, drops, press] = await Promise.all([
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
    sanityFetch<PressCard[]>({
      label: 'pressCards',
      query: pressCardsQuery,
      fallback: [],
    }),
  ]);

  const tagline = home?.tagline?.trim() || DEFAULT_TAGLINE;
  const taglineLines = tagline.split('\n');

  // Drop links for the LOOKBOOK section: from Sanity, or the built-in defaults.
  const dropLinks =
    drops.length > 0
      ? drops.map((d) => ({
          id: d._id,
          slug: d.slug,
          label: d.dropNumber ? `${d.dropNumber}/${d.title}` : d.title,
          cover: d.heroImage?.asset ? d.heroImage : d.images?.find((i) => i.asset),
        }))
      : DEFAULT_DROPS.map((slug) => ({
          id: slug,
          slug,
          label: formatLabel(slug),
          cover: undefined as SanityImageRef | undefined,
        }));

  return (
    <Container className={contentPadY}>
      {/* The page's single real heading; the logo below is decorative. */}
      <h1 className="sr-only">Cinque</h1>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          url: siteUrl,
          name: 'Cinque',
          publisher: { '@id': `${siteUrl}/#organization` },
          inLanguage: 'en-GB',
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
          const cmsImages = (
            'imageKey' in s
              ? (home?.[s.imageKey as keyof HomePageDoc] as SanityImageRef[] | undefined)
              : undefined
          )?.filter((i) => i.asset);

          const isLookbook = 'drops' in s && s.drops;

          const mediaImages: MediaImage[] = isLookbook
            ? lookbookCards(home, dropLinks)
            : s.href === '/press'
              ? pressCards(home, press)
              : (cmsImages ?? []).map((i) => ({
                  url: imageUrl(i),
                  alt: i.alt || `${s.label} — Cinque`,
                }));

          return (
            <section key={s.href}>
              <Link href={s.href}>
                <H1 as="h2" className="mb-[10px] border-b border-oslo pb-[10px] hover:text-redcurrent">
                  {s.label}
                </H1>
              </Link>

              {/* LOOKBOOK's per-drop links are no longer a separate row: each
                  drop title sits on its own card above its hero image (see
                  `lookbookCards`). PRESS works the same way, one card per
                  entry. Mobile shows the covers only. */}
              <HomeSectionMedia
                images={mediaImages}
                href={s.href}
                sectionLabel={s.label}
                priority={'priority' in s && s.priority}
              />
            </section>
          );
        })}
      </div>
    </Container>
  );
}
