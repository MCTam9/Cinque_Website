import Link from 'next/link';
import Container from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import { H1, H3, P1 } from '@/components/typography';

const CATEGORIES = [
  { label: 'SHOP', href: '/shop', blurb: 'Individually made pieces' },
  { label: 'LOOKBOOK', href: '/lookbook', blurb: 'Drops & the studio archive' },
  { label: 'EXHIBITION', href: '/exhibitions', blurb: 'Shows & installations' },
  { label: 'STUDIO', href: '/studio', blurb: 'About Cinque & commissions' },
] as const;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function HomePage() {
  return (
    <Container className="py-16 md:py-24">
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
      {/* Hero */}
      <section className="mb-16 md:mb-24">
        <H1 className="mb-6 text-4xl md:text-5xl font-bold tracking-tight">Cinque®</H1>
        <P1 className="max-w-md text-oslo">
          Jewellery and object maker.
          <br />
          Sealing memories into a tactile archive.
          <br />
          Individually made, cast and hallmarked in London.
        </P1>
      </section>

      {/* Category blocks */}
      <section aria-label="Sections" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group block border border-oslo/50 bg-cloud/30 p-8 min-h-[200px] flex flex-col justify-between transition-colors hover:border-redcurrent"
          >
            <H3 className="font-bold group-hover:text-redcurrent">{c.label}</H3>
            <P1 className="text-oslo">{c.blurb}</P1>
          </Link>
        ))}
      </section>
    </Container>
  );
}
