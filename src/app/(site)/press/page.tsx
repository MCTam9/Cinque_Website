import type { Metadata } from 'next';
import Container, { contentPadY } from '@/components/Container';
import { H1, P1 } from '@/components/typography';
import { PressEntry, type PressEntryDoc } from '@/components/PressEntry';
import { sanityFetch } from '@/lib/sanity/fetch';
import { pressQuery } from '@/lib/sanity/queries';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Press',
  description: 'Cinque® press, shows and installations.',
  alternates: { canonical: '/press' },
};

interface PressDoc extends PressEntryDoc {
  _id: string;
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
        items.map((ex, i) => (
          // The slug doubles as the anchor the Home page's PRESS images link to
          // (/press#slug). scroll-mt clears the 70px sticky Nav, so a jumped-to
          // entry starts below it rather than under it.
          <PressEntry
            key={ex._id}
            ex={ex}
            id={ex.slug}
            className={`scroll-mt-[80px] ${i === items.length - 1 ? '' : 'mb-[40px] md:mb-[60px]'}`}
            titleHref={ex.slug ? `/press/${ex.slug}` : undefined}
            imageLimit={3}
          />
        ))
      )}
    </Container>
  );
}
