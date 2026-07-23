import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { H1, H2, H3, P1, P2 } from '@/components/typography';
import { formatLabel } from '@/lib/products';

export const metadata: Metadata = {
  title: 'Lookbook',
  description: 'Cinque® drops and the studio archive — one-of-a-kind and limited objects.',
};

const HAND = '/figma/lookbook-1-hand.png';
const BENCH = '/figma/lookbook-2-bench-flatlay.png';
const MACRO = '/figma/lookbook-3-macro-hallmark-bead.png';

const DROPS = [
  '00_Archive',
  '01_Metal_Veil',
  '02_Shell_Relic',
  '03_Hastata',
  '04_Lost_Garden',
] as const;

function LbImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="group relative aspect-[2/3] w-full overflow-hidden bg-cloud/30">
      <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 300px" className="img-bw object-cover" />
    </div>
  );
}

export default async function LookbookPage({
  searchParams,
}: {
  searchParams: Promise<{ drop?: string }>;
}) {
  const { drop } = await searchParams;
  const active = DROPS.includes(drop as (typeof DROPS)[number]) ? (drop as string) : DROPS[0];
  const idx = DROPS.indexOf(active as (typeof DROPS)[number]);
  const prev = idx > 0 ? DROPS[idx - 1] : null;
  const next = idx < DROPS.length - 1 ? DROPS[idx + 1] : null;

  return (
    <div className="grid w-full grid-cols-1 gap-x-[10px] px-5 py-[40px] md:grid-cols-[minmax(0,0.25fr)_minmax(0,1fr)_minmax(0,0.25fr)] md:py-[60px]">
      {/* Rule above sidebar */}
      <div className="hidden border-b border-oslo md:col-start-1 md:row-start-1 md:block" />

      {/* Header + rule */}
      <header className="mb-[30px] flex items-end justify-between border-b border-oslo pb-[10px] md:col-start-2 md:row-start-1 md:mb-0">
        <H1>LOOKBOOK</H1>
        <P1 className="hidden text-right text-oslo md:block">
          Individually made, cast and hallmarked in London.
        </P1>
      </header>

      {/* Drop sidebar */}
      <aside className="mb-[30px] pt-[10px] md:col-start-1 md:row-start-2 md:mb-0 md:pr-4">
        <P2 className="mb-[10px] text-oslo">DROP</P2>
        <ul className="flex flex-col gap-[10px]">
          {DROPS.map((d) => (
            <li key={d}>
              <Link
                href={`/lookbook?drop=${d}`}
                className={`type-h3 transition-colors ${
                  d === active
                    ? 'text-redcurrent underline underline-offset-4'
                    : 'text-graphite hover:text-redcurrent'
                }`}
              >
                {formatLabel(d)}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editorial content */}
      <div className="pt-[10px] md:col-start-2 md:row-start-2">
        <H2 className="mb-[10px] border-b border-oslo pb-[10px]">Drop {formatLabel(active)}</H2>

        {/* Row 1: copy + two small images | tall image */}
        <div className="mb-[10px] grid grid-cols-1 gap-[10px] md:grid-cols-2">
          <div className="flex flex-col gap-[10px]">
            <div className="flex flex-col gap-[20px] type-p1">
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
                <Link href="/studio#contact" className="underline underline-offset-4 hover:text-redcurrent">
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

        {/* Pagination between drops — both ends carry the drop title */}
        <nav className="flex items-center justify-between border-t border-graphite pt-[20px]">
          {prev ? (
            <Link href={`/lookbook?drop=${prev}`}>
              <H3 className="font-bold hover:text-redcurrent">&lt; {formatLabel(prev)}</H3>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/lookbook?drop=${next}`}>
              <H3 className="font-bold hover:text-redcurrent">{formatLabel(next)} &gt;</H3>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  );
}
