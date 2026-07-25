import Image from 'next/image';
import Link from 'next/link';
import type { PortableTextBlock } from '@portabletext/types';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { urlFor } from '@/lib/sanity/image';
import { PortableText } from './PortableText';

/**
 * Renders a page composed in the Studio's page builder. Each block type maps to
 * one component below, styled on the site's design system: the `.type-*` scale
 * for text and the 10/20/30/40px spacing rhythm, stacking to one or two columns
 * on mobile whatever column count the Studio asks for.
 *
 * Headings are h2 — every page that renders a PageBuilder (/pages/[slug],
 * /collections/[slug], /press/[slug]) already provides the page's h1.
 *
 * Images use next/image against the Sanity CDN (optimized, low cost). Text is
 * rendered via Portable Text — never raw HTML injection.
 */

type SanityImage = { alt?: string; asset?: SanityImageSource };

interface BaseBlock {
  _type: string;
  _key: string;
}
interface HeroBlock extends BaseBlock {
  _type: 'heroBlock';
  heading?: string;
  subheading?: string;
  image?: SanityImage;
  ctaLabel?: string;
  ctaHref?: string;
}
interface ImageTextBlock extends BaseBlock {
  _type: 'imageTextBlock';
  image?: SanityImage;
  text?: PortableTextBlock[];
  layout?: 'image-left' | 'image-right';
}
interface GalleryBlock extends BaseBlock {
  _type: 'galleryBlock';
  images?: SanityImage[];
  columns?: number;
}
interface RichTextBlock extends BaseBlock {
  _type: 'richTextBlock';
  text?: PortableTextBlock[];
}

export type PageBlock =
  | HeroBlock
  | ImageTextBlock
  | GalleryBlock
  | RichTextBlock
  | BaseBlock;

function img(source: SanityImage, width: number) {
  return source.asset ? urlFor(source.asset).width(width).auto('format').url() : '';
}

// ── Individual block renderers (placeholders) ──────────────────

function Hero({ block }: { block: HeroBlock }) {
  return (
    <section data-block="hero" className="flex flex-col gap-[20px]">
      {block.image?.asset && (
        <div className="group relative aspect-video w-full overflow-hidden bg-cloud/30">
          <Image
            src={img(block.image, 1600)}
            alt={block.image.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="img-bw object-cover"
            priority
          />
        </div>
      )}
      {block.heading && <h2 className="type-h2">{block.heading}</h2>}
      {block.subheading && <p className="type-p1 text-oslo">{block.subheading}</p>}
      {block.ctaLabel &&
        block.ctaHref &&
        (block.ctaHref.startsWith('/') ? (
          <Link href={block.ctaHref} className="btn w-fit">
            {block.ctaLabel}
          </Link>
        ) : (
          <a
            href={block.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn w-fit"
          >
            {block.ctaLabel}
          </a>
        ))}
    </section>
  );
}

function ImageText({ block }: { block: ImageTextBlock }) {
  const imageRight = block.layout === 'image-right';
  return (
    <section
      data-block="image-text"
      data-layout={block.layout ?? 'image-left'}
      className="grid grid-cols-1 gap-[20px] md:grid-cols-2"
    >
      {block.image?.asset && (
        <div
          className={`group relative aspect-[4/3] w-full overflow-hidden bg-cloud/30 ${
            imageRight ? 'md:order-2' : ''
          }`}
        >
          <Image
            src={img(block.image, 1000)}
            alt={block.image.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="img-bw object-cover"
          />
        </div>
      )}
      <div className="type-p1 flex flex-col gap-[10px]">
        <PortableText value={block.text} />
      </div>
    </section>
  );
}

function Gallery({ block }: { block: GalleryBlock }) {
  // The Studio's column count applies from md up only — phones cap at 2-up,
  // however many columns the editor asked for (and stay 1-up for a 1-col
  // gallery, so mobile never shows more columns than desktop).
  const columns = Math.max(1, block.columns ?? 3);
  const mobileColumns = Math.min(columns, 2);
  return (
    <section
      data-block="gallery"
      className={`grid gap-[10px] md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] ${
        mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'
      }`}
      style={{ '--cols': columns } as React.CSSProperties}
    >
      {(block.images ?? []).map((image, i) =>
        image.asset ? (
          <div
            key={i}
            className="group relative aspect-square w-full overflow-hidden bg-cloud/30"
          >
            <Image
              src={img(image, 800)}
              alt={image.alt ?? ''}
              fill
              sizes={`(max-width: 768px) ${Math.round(
                100 / mobileColumns
              )}vw, ${Math.round(100 / columns)}vw`}
              className="img-bw object-cover"
            />
          </div>
        ) : null
      )}
    </section>
  );
}

function RichText({ block }: { block: RichTextBlock }) {
  return (
    <section data-block="rich-text" className="type-p1 flex flex-col gap-[10px]">
      <PortableText value={block.text} />
    </section>
  );
}

// ── Dispatcher ─────────────────────────────────────────────────

export function PageBuilder({ blocks }: { blocks?: PageBlock[] | null }) {
  if (!blocks?.length) return null;
  return (
    <div className="flex flex-col gap-[30px] md:gap-[40px]">
      {blocks.map((block) => {
        switch (block._type) {
          case 'heroBlock':
            return <Hero key={block._key} block={block as HeroBlock} />;
          case 'imageTextBlock':
            return <ImageText key={block._key} block={block as ImageTextBlock} />;
          case 'galleryBlock':
            return <Gallery key={block._key} block={block as GalleryBlock} />;
          case 'richTextBlock':
            return <RichText key={block._key} block={block as RichTextBlock} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
