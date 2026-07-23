import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import { H1, H3 } from '@/components/typography';
import { formatLabel } from '@/lib/products';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Each Home section = a heading + a horizontal image strip (rendered from the
// Figma frame so the crops match), linking to its page.
const SECTIONS = [
  { href: '/shop', label: 'SHOP', img: '/figma/home-shop.png', w: 1800, h: 653 },
  {
    href: '/lookbook',
    label: 'LOOKBOOK',
    img: '/figma/home-lookbook.png',
    w: 1800,
    h: 516,
    drops: ['04_Lost_Garden', '03_Hastata', '02_Shell_Relic', '01_Metal_Veil', '00_Archive'],
  },
  { href: '/exhibitions', label: 'EXHIBITION', img: '/figma/home-exhibition.png', w: 1800, h: 652 },
  { href: '/studio', label: 'STUDIO', img: '/figma/home-studio.png', w: 1800, h: 652 },
] as const;

export default function HomePage() {
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

      {/* Hero: logo left, tagline right */}
      <section className="mb-[40px] flex flex-col gap-[30px] md:mb-[60px] md:flex-row md:items-end md:justify-between">
        <img
          src="/figma/cinque-logo.svg"
          alt="Cinque"
          width={351}
          height={96}
          className="h-auto w-[260px] md:w-[351px]"
        />
        <H3 className="text-oslo md:text-right">
          Jewellery and object maker.
          <br />
          Sealing memories into a tactile archive.
          <br />
          Individually made, cast and hallmarked in London.
        </H3>
      </section>

      {/* Section strips */}
      <div className="flex flex-col gap-[40px] md:gap-[60px]">
        {SECTIONS.map((s) => {
          const hasDrops = 'drops' in s && s.drops;
          const strip = (
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
          if (hasDrops) {
            return (
              <section key={s.href} className="group block">
                <Link href={s.href}>
                  <H1 className="mb-[10px] border-b border-oslo pb-[10px] hover:text-redcurrent">
                    {s.label}
                  </H1>
                </Link>
                <div className="mb-[10px] hidden grid-cols-5 gap-[10px] sm:grid">
                  {s.drops.map((d) => (
                    <Link
                      key={d}
                      href={`/lookbook?drop=${d}`}
                      className="type-h3 text-graphite hover:text-redcurrent"
                    >
                      {formatLabel(d)}
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
