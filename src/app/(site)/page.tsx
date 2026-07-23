import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import { H1, H3, P2 } from '@/components/typography';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Each Home section = a heading + a horizontal image strip (rendered from the
// Figma frame so the crops match), linking to its page.
const SECTIONS = [
  { href: '/shop', label: 'SHOP', img: '/figma/home-shop.png', w: 1800, h: 653, labelBelow: true },
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
    <Container className="py-10 md:py-14">
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
      <section className="mb-12 flex flex-col gap-8 md:mb-16 md:flex-row md:items-end md:justify-between">
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
      <div className="flex flex-col gap-14 md:gap-20">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group block transition-opacity hover:opacity-90"
          >
            {!s.labelBelow && (
              <H1 className="mb-3 border-b border-graphite pb-3 group-hover:text-redcurrent">
                {s.label}
              </H1>
            )}

            {'drops' in s && s.drops && (
              <div className="mb-2 hidden grid-cols-5 gap-[10px] sm:grid">
                {s.drops.map((d) => (
                  <P2 key={d} className="text-oslo">
                    {d}
                  </P2>
                ))}
              </div>
            )}

            <Image
              src={s.img}
              alt={`${s.label} — Cinque`}
              width={s.w}
              height={s.h}
              sizes="(max-width: 768px) 100vw, 900px"
              className="h-auto w-full"
              priority={s.label === 'SHOP'}
            />

            {s.labelBelow && (
              <H1 className="mt-3 border-b border-graphite pb-3 group-hover:text-redcurrent">
                {s.label}
              </H1>
            )}
          </Link>
        ))}
      </div>
    </Container>
  );
}
