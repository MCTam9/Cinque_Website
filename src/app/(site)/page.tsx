import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import { H1, H3 } from '@/components/typography';
import { formatLabel } from '@/lib/products';
import { sanityClient } from '@/lib/sanity/client';
import { homePageQuery, lookbookDropsQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
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

// Each Home section = a heading + a horizontal image strip, linking to its page.
// `imageKey` is the Sanity field to swap the strip; `img` is the built-in
// fallback exported from Figma (so crops match until an image is uploaded).
const SECTIONS = [
  { href: '/shop', label: 'SHOP', imageKey: 'shopImage', img: '/figma/home-shop.png', w: 1800, h: 653 },
  { href: '/lookbook', label: 'LOOKBOOK', imageKey: 'lookbookImage', img: '/figma/home-lookbook.png', w: 1800, h: 516, drops: true },
  { href: '/exhibitions', label: 'EXHIBITION', imageKey: 'exhibitionImage', img: '/figma/home-exhibition.png', w: 1800, h: 652 },
  { href: '/studio', label: 'STUDIO', imageKey: 'studioImage', img: '/figma/home-studio.png', w: 1800, h: 652 },
] as const;

export default async function HomePage() {
  let home: HomePageDoc | null = null;
  let drops: LookbookDrop[] = [];
  try {
    [home, drops] = await Promise.all([
      sanityClient.fetch<HomePageDoc | null>(homePageQuery),
      sanityClient.fetch<LookbookDrop[]>(lookbookDropsQuery),
    ]);
  } catch {
    home = null;
    drops = [];
  }

  const tagline = home?.tagline?.trim() || DEFAULT_TAGLINE;
  const taglineLines = tagline.split('\n');

  // Drop links for the LOOKBOOK strip: from Sanity, or the built-in defaults.
  const dropLinks =
    drops.length > 0
      ? drops.map((d) => ({
          slug: d.slug,
          label: d.dropNumber ? `${d.dropNumber}/${d.title}` : d.title,
        }))
      : DEFAULT_DROPS.map((slug) => ({ slug, label: formatLabel(slug) }));

  return (
    <Container className="py-[40px] md:py-[60px]">
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
        <img
          src="/figma/cinque-logo.svg"
          alt="Cinque"
          width={351}
          height={96}
          className="hidden h-auto w-[260px] md:block md:w-[351px]"
        />
        <H3 className="text-oslo md:text-right">
          {taglineLines.map((line, i) => (
            <Fragment key={i}>
              {line}
              {i < taglineLines.length - 1 && <br />}
            </Fragment>
          ))}
        </H3>
      </section>

      {/* Section strips */}
      <div className="flex flex-col gap-[40px] md:gap-[60px]">
        {SECTIONS.map((s) => {
          const cmsImage = home?.[s.imageKey as keyof HomePageDoc] as
            | SanityImageRef
            | undefined;
          const strip =
            cmsImage?.asset ? (
              // Uploaded strip: Sanity CDN already optimizes; keep natural aspect.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlFor(cmsImage as never).width(1800).url()}
                alt={cmsImage.alt || `${s.label} — Cinque`}
                className="h-auto w-full transition-opacity hover:opacity-90"
              />
            ) : (
              <Image
                src={s.img}
                alt={`${s.label} — Cinque`}
                width={s.w}
                height={s.h}
                sizes="(max-width: 768px) 100vw, 900px"
                className="h-auto w-full transition-opacity hover:opacity-90"
                priority={s.label === 'SHOP'}
              />
            );

          // LOOKBOOK: heading + per-drop links (can't nest links) + strip.
          if ('drops' in s && s.drops) {
            return (
              <section key={s.href} className="group block">
                <Link href={s.href}>
                  <H1 className="mb-[10px] border-b border-oslo pb-[10px] hover:text-redcurrent">
                    {s.label}
                  </H1>
                </Link>
                <div className="mb-[10px] hidden grid-cols-5 gap-[10px] sm:grid">
                  {dropLinks.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/lookbook?drop=${d.slug}`}
                      className="type-h3 text-graphite hover:text-redcurrent"
                    >
                      {d.label}
                    </Link>
                  ))}
                </div>
                <Link href={s.href}>{strip}</Link>
              </section>
            );
          }

          // SHOP / EXHIBITION / STUDIO: whole section is one link.
          return (
            <Link key={s.href} href={s.href} className="group block">
              <H1 className="mb-[10px] border-b border-oslo pb-[10px] group-hover:text-redcurrent">
                {s.label}
              </H1>
              {strip}
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
