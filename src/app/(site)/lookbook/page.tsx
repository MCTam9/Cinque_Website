import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { H1, H2, H3, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Lookbook',
  description: 'Cinque® drops and the studio archive — one-of-a-kind and limited objects.',
};

const HAND = '/figma/lookbook-1-hand.png';
const BENCH = '/figma/lookbook-2-bench-flatlay.png';
const MACRO = '/figma/lookbook-3-macro-hallmark-bead.png';

const DROPS = ['00_Archive 01_Metal_Veil', '02_Shell_Relic', '03_Hastata', '04_Lost_Garden'];

/** B&W → colour-on-hover editorial image at a fixed 2:3 ratio. */
function LbImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="group relative aspect-[2/3] w-full overflow-hidden bg-cloud/30">
      <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 300px" className="img-bw object-cover" />
    </div>
  );
}

export default function LookbookPage() {
  return (
    <div className="mx-auto grid w-full max-w-frame grid-cols-1 gap-x-[10px] px-5 py-[40px] md:grid-cols-[minmax(0,0.25fr)_minmax(0,1fr)_minmax(0,0.25fr)] md:px-0 md:py-[60px]">
      {/* Header — centre column */}
      <header className="mb-5 flex items-end justify-between md:col-start-2 md:row-start-1">
        <H1>LOOKBOOK</H1>
        <P1 className="hidden text-right text-oslo md:block">
          Individually made, cast and hallmarked in London.
        </P1>
      </header>

      {/* Drop sidebar — left gutter (desktop) */}
      <aside className="mb-5 md:col-start-1 md:row-start-2 md:mb-0 md:pr-4">
        <P2 className="mb-2 text-oslo">LOOKBOOK_DROP</P2>
        <ul className="flex flex-col gap-1">
          {DROPS.map((d) => (
            <li key={d}>
              <span className="type-h3">{d}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editorial content — centre column */}
      <div className="md:col-start-2 md:row-start-2">
        <H2 className="mb-[10px] border-b border-graphite pb-[10px]">Drop_00_Archive</H2>

        {/* Row 1: copy + two small images | tall image */}
        <div className="mb-[10px] grid grid-cols-1 gap-[10px] md:grid-cols-2">
          <div className="flex flex-col gap-[10px]">
            <div className="flex flex-col gap-5 type-p1">
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
                <Link href="/contact" className="underline underline-offset-4 hover:text-redcurrent">
                  Contact us
                </Link>{' '}
                to request a custom variation of an existing design. Further details regarding
                timeline and quotation will follow.
              </P1>
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <LbImage src={MACRO} alt="Cinque piece — macro detail" />
              <LbImage src={BENCH} alt="Cinque studio bench" />
            </div>
          </div>
          <LbImage src={HAND} alt="Cinque piece worn on the hand" />
        </div>

        {/* Row 2: three images */}
        <div className="mb-[10px] grid grid-cols-2 gap-[10px] md:grid-cols-3">
          <LbImage src={HAND} alt="Cinque piece" />
          <LbImage src={BENCH} alt="Cinque studio bench" />
          <LbImage src={MACRO} alt="Cinque piece — macro detail" />
        </div>

        {/* Row 3: two images */}
        <div className="mb-[30px] grid grid-cols-1 gap-[10px] md:grid-cols-2">
          <LbImage src={HAND} alt="Cinque piece" />
          <LbImage src={MACRO} alt="Cinque piece — macro detail" />
        </div>

        {/* Pagination */}
        <nav className="flex items-center justify-between border-t border-graphite pt-5">
          <span className="type-h3 text-oslo">&lt;</span>
          <H3 className="font-bold">01_Metal_Veil &gt;</H3>
        </nav>
      </div>
    </div>
  );
}
