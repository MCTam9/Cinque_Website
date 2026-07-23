import type { Metadata } from 'next';
import Image from 'next/image';
import Container from '@/components/Container';
import { H1, H2, P1 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Exhibition',
  description: 'Cinque® exhibitions, shows and installations.',
};

const IMAGES = [
  '/figma/lookbook-1-hand.png',
  '/figma/lookbook-2-bench-flatlay.png',
  '/figma/lookbook-3-macro-hallmark-bead.png',
];

function ExhImage({ src, hideOnMobile = false }: { src: string; hideOnMobile?: boolean }) {
  return (
    <div className={`group relative aspect-[2/3] w-full overflow-hidden bg-cloud/30 ${hideOnMobile ? 'max-md:hidden' : ''}`}>
      <Image src={src} alt="Cinque exhibition piece" fill sizes="(max-width: 768px) 50vw, 300px" className="img-bw object-cover" />
    </div>
  );
}

/** One exhibition/press entry: bottom-aligned title + publication (both over a
 *  grey rule at the same y), then description | Date/Location, then 3 images. */
function Entry({
  title,
  publication,
  date,
  location,
  children,
  last = false,
}: {
  title: string;
  publication: string;
  date: string;
  location: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <article className={last ? '' : 'mb-[60px]'}>
      {/* Header row — title + publication bottom-aligned over a shared grey rule */}
      <div className="mb-[10px] grid grid-cols-1 items-end gap-x-[10px] gap-y-[10px] md:grid-cols-3">
        <H2 className="border-b border-oslo pb-[10px] md:col-span-2">{title}</H2>
        <P1 className="border-b border-oslo pb-[10px] text-right text-oslo">{publication}</P1>
      </div>

      {/* Body — description | Date/Location, then the 3 image columns */}
      <div className="grid grid-cols-1 gap-x-[10px] gap-y-[30px] md:grid-cols-3">
        <div className="flex flex-col gap-[20px] md:col-span-2">{children}</div>
        <dl className="flex h-fit gap-4 type-p1">
          <div className="flex flex-col text-oslo">
            <dt>Date</dt>
            <dt>Location</dt>
          </div>
          <div className="flex flex-col text-graphite">
            <dd>{date}</dd>
            <dd>{location}</dd>
          </div>
        </dl>
        <ExhImage src={IMAGES[0]} />
        <ExhImage src={IMAGES[1]} />
        <ExhImage src={IMAGES[2]} hideOnMobile />
      </div>
    </article>
  );
}

export default function ExhibitionsPage() {
  return (
    <Container className="py-[40px] md:py-[60px]">
      <H1 className="mb-[10px] border-b border-graphite pb-[10px]">EXHIBITION</H1>

      <Entry
        title="The_Invisible_Made_Visible"
        publication="London Craft Week"
        date="2026-09"
        location="Blackdot Gallery, London"
      >
        <P1>
          Jewellery becomes an intimate archive, where reclaimed materials and antique textiles
          preserve traces of everyday histories.
        </P1>
        <P1>
          The Invisible Made Visible at @londoncraftweek explores the hidden forces that shape making
          — from unseen labour and material transformation to the quiet gestures embedded in process.
          Bringing together practices across jewellery, ceramics, sculpture, installation, furniture,
          wearable works, glass, textile and embroidery, the exhibition reveals what often remains
          unnoticed: the time, care and experimentation behind each piece, highlighting the stories
          and processes that usually remain invisible.
        </P1>
      </Entry>

      <Entry
        title="Jewellery_Shaped_by_Architecture_History_and_the_Human_Hand"
        publication="Scura Magazine"
        date="2026-09"
        location="Blackdot Gallery, London"
        last
      >
        <P1>
          <a
            href="https://scura.co.uk/cinque/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-redcurrent"
          >
            Read Our Story on Scura Magazine
          </a>
        </P1>
        <P1 className="text-oslo">Words by Charlie Monaghan, Photography by Ashley Law.</P1>
      </Entry>
    </Container>
  );
}
