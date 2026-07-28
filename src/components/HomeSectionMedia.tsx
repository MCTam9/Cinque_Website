import Link from 'next/link';
import Image from 'next/image';

export type MediaImage = {
  url: string;
  alt: string;
  /** Caption travelling with this image, e.g. a drop title on LOOKBOOK. */
  label?: string;
  /** Per-image destination; falls back to the section's own link. */
  href?: string;
  /**
   * Accessible name for an uncaptioned card that has its own destination, so
   * sibling links aren't all announced as the section name.
   */
  linkLabel?: string;
};

/** Desktop shows 5 across, mobile 4; the rest never render. */
const DESKTOP_MAX = 5;
const MOBILE_MAX = 4;

/**
 * A home section's imagery: a fixed handful of cards, all on screen at once, no
 * scrolling strip and no auto-scroll.
 *
 * Both breakpoints are a single row whose column count follows the image count
 * — 3 images give 3 columns, 4 give 4 — so a section is never padded out with
 * empty cells and never wraps.
 *
 * Mobile: up to 4 columns, pictures only — captions are hidden, so the drop
 * titles live on the Lookbook page itself.
 *
 * Desktop: up to 5 columns, each captioned with its label.
 */
export default function HomeSectionMedia({
  images,
  href,
  sectionLabel,
  priority = false,
}: {
  images: MediaImage[];
  href: string;
  sectionLabel: string;
  /** Eager-loads the first card — set on the topmost section, for LCP. */
  priority?: boolean;
}) {
  const shown = images.slice(0, DESKTOP_MAX);
  if (shown.length === 0) return null;

  return (
    <div
      className="grid gap-[10px] [grid-template-columns:repeat(var(--home-cols-sm),minmax(0,1fr))] md:[grid-template-columns:repeat(var(--home-cols),minmax(0,1fr))]"
      style={
        {
          '--home-cols-sm': Math.min(shown.length, MOBILE_MAX),
          '--home-cols': shown.length,
        } as React.CSSProperties
      }
    >
      {shown.map((img, i) => (
        <Link
          key={i}
          href={img.href ?? href}
          // With a visible caption the link names itself; without one it needs
          // the section name. Mobile hides captions, so the image alt carries it.
          aria-label={img.label ? undefined : (img.linkLabel ?? sectionLabel)}
          className={[
            'group block',
            // Anything past the mobile cap only exists on desktop.
            i >= MOBILE_MAX ? 'hidden md:block' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {img.label && (
            <div className="type-h3 mb-[10px] hidden truncate text-graphite transition-colors group-hover:text-redcurrent md:block">
              {img.label}
            </div>
          )}
          <div className="relative aspect-[2/3] overflow-hidden bg-cloud/30">
            <Image
              src={img.url}
              alt={img.alt}
              fill
              sizes={`(max-width: 768px) ${Math.round(
                100 / Math.min(shown.length, MOBILE_MAX)
              )}vw, ${Math.round(100 / shown.length)}vw`}
              className="img-bw object-cover transition-opacity group-hover:opacity-90"
              priority={priority && i === 0}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
