import type { Metadata } from 'next';
import Image from 'next/image';
import Container from '@/components/Container';
import { H1, H2, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Exhibition',
  description: 'Cinque® exhibitions, shows and installations.',
};

const ENTRIES = [
  {
    title: 'The_Invisible_Made_Visible',
    date: '2026-09',
    location: 'Blackdot Gallery, London',
    publication: 'London Craft Week',
    image: '/figma/home-exhibition.png',
    imageRatio: '900/652',
    body: 'Jewellery becomes an intimate archive, where reclaimed materials and antique textiles preserve traces of everyday histories. The Invisible Made Visible at @londoncraftweek explores the hidden forces that shape making — from unseen labour and material transformation to the quiet gestures embedded in process. Bringing together practices across jewellery, ceramics, sculpture, installation, furniture, wearable works, glass, textile and embroidery, the exhibition reveals what often remains unnoticed: the time, care and experimentation behind each piece, highlighting the stories and processes that usually remain invisible.',
  },
] as const;

export default function ExhibitionsPage() {
  return (
    <Container className="py-[40px] md:py-[60px]">
      <H1 className="mb-[30px]">EXHIBITION</H1>

      {ENTRIES.map((ex) => (
        <article key={ex.title} className="mb-[60px] border-t border-graphite pt-[30px]">
          <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <H2 className="max-w-xl">{ex.title}</H2>
            <dl className="flex shrink-0 gap-5 type-p2">
              <div className="flex flex-col gap-0.5 text-oslo">
                <dt>Date</dt>
                <dt>Location</dt>
              </div>
              <div className="flex flex-col gap-0.5 text-graphite">
                <dd>{ex.date}</dd>
                <dd>{ex.location}</dd>
              </div>
            </dl>
          </div>

          <div className="group relative mb-5 w-full overflow-hidden bg-cloud/30" style={{ aspectRatio: ex.imageRatio }}>
            <Image src={ex.image} alt={ex.title} fill sizes="(max-width: 768px) 100vw, 900px" className="img-bw object-cover" />
          </div>

          <P1 className="max-w-2xl">{ex.body}</P1>
          {ex.publication && <P2 className="mt-2 text-oslo">{ex.publication}</P2>}
        </article>
      ))}

      {/* Press feature — Scura Magazine */}
      <article className="border-t border-graphite pt-[30px]">
        <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <H2 className="max-w-xl">Jewellery_Shaped_by_Architecture_History_and_the_Human_Hand</H2>
          <dl className="flex shrink-0 gap-5 type-p2">
            <div className="flex flex-col gap-0.5 text-oslo">
              <dt>Date</dt>
              <dt>Location</dt>
            </div>
            <div className="flex flex-col gap-0.5 text-graphite">
              <dd>2026-05</dd>
              <dd>Blackdot Gallery, London</dd>
            </div>
          </dl>
        </div>
        <P2 className="mb-1 text-oslo">Scura Magazine</P2>
        <P1>
          Read Our Story on{' '}
          <a
            href="https://scura.co.uk/cinque/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-redcurrent"
          >
            Scura Magazine
          </a>
          .
          <br />
          Words by Charlie Monaghan, Photography by Ashley Law.
        </P1>
      </article>
    </Container>
  );
}
