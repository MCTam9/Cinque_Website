import Image from 'next/image';
import type { PortableTextBlock } from '@portabletext/types';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { urlFor } from '@/lib/sanity/image';
import { PortableText } from './PortableText';

/**
 * Renders a page composed in the Studio's page builder. Each block type maps to
 * one component below — replace each placeholder's markup with your exported
 * Figma component (keep the same props) and the whole CMS→page pipeline works.
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
    <section data-block="hero">
      {block.image?.asset && (
        <div style={{ position: 'relative', aspectRatio: '16 / 9' }}>
          <Image
            src={img(block.image, 1600)}
            alt={block.image.alt ?? ''}
            fill
            sizes="100vw"
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      )}
      {block.heading && <h1>{block.heading}</h1>}
      {block.subheading && <p>{block.subheading}</p>}
      {block.ctaLabel && block.ctaHref && <a href={block.ctaHref}>{block.ctaLabel}</a>}
    </section>
  );
}

function ImageText({ block }: { block: ImageTextBlock }) {
  return (
    <section data-block="image-text" data-layout={block.layout ?? 'image-left'}>
      {block.image?.asset && (
        <div style={{ position: 'relative', aspectRatio: '4 / 3' }}>
          <Image
            src={img(block.image, 1000)}
            alt={block.image.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      <div>
        <PortableText value={block.text} />
      </div>
    </section>
  );
}

function Gallery({ block }: { block: GalleryBlock }) {
  return (
    <section
      data-block="gallery"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${block.columns ?? 3}, 1fr)`,
        gap: '8px',
      }}
    >
      {(block.images ?? []).map((image, i) =>
        image.asset ? (
          <div key={i} style={{ position: 'relative', aspectRatio: '1 / 1' }}>
            <Image
              src={img(image, 800)}
              alt={image.alt ?? ''}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              style={{ objectFit: 'cover' }}
            />
          </div>
        ) : null
      )}
    </section>
  );
}

function RichText({ block }: { block: RichTextBlock }) {
  return (
    <section data-block="rich-text">
      <PortableText value={block.text} />
    </section>
  );
}

// ── Dispatcher ─────────────────────────────────────────────────

export function PageBuilder({ blocks }: { blocks?: PageBlock[] | null }) {
  if (!blocks?.length) return null;
  return (
    <>
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
    </>
  );
}
