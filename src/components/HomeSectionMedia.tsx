'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type MediaImage = {
  url: string;
  alt: string;
  /** Caption travelling with this image, e.g. a drop title on LOOKBOOK. */
  label?: string;
  /** Per-image destination; falls back to the section's own link. */
  href?: string;
};

/**
 * A home section's imagery. Each image is a card — caption above, picture
 * below — so a label and its picture move as one unit in every layout rather
 * than living in a separate row that has to be read across.
 *
 * Mobile: a slow, continuously auto-scrolling horizontal strip showing 2 cards
 * at a time.
 *
 * Desktop: 1–5 images become a grid whose column count follows the image
 * count; 6+ stay a strip (a grid of many would shrink each image too far).
 *
 * The strip is one DOM tree in both cases: the image set is duplicated so the
 * scroll can wrap seamlessly, and the duplicates are display:none in the
 * desktop grid. Auto-scroll only runs when the container actually overflows,
 * so it no-ops on the grid. It pauses briefly on manual interaction (wheel /
 * drag / touch) and is disabled under prefers-reduced-motion.
 */
export default function HomeSectionMedia({
  images,
  href,
  sectionLabel,
}: {
  images: MediaImage[];
  href: string;
  sectionLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // A grid on desktop only makes sense for a handful of images.
  const asGrid = images.length <= 5;
  // Duplicate the set so the scroll can wrap seamlessly.
  const loop = [...images, ...images];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const SPEED = 0.4; // px/frame ≈ 24px/s — slow
    let pos = el.scrollLeft;
    let paused = false;
    let raf = 0;
    let resume: ReturnType<typeof setTimeout>;

    const step = () => {
      // Laid out as a grid (desktop, ≤5 images) there is nothing to scroll —
      // keep ticking cheaply so a resize back to the strip picks up again.
      if (!paused && el.scrollWidth > el.clientWidth + 1) {
        pos += SPEED;
        const half = el.scrollWidth / 2;
        if (half > 0 && pos >= half) pos -= half;
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(step);
    };

    // Yield to the user on any manual scroll, then resume from where they left.
    const pause = () => {
      paused = true;
      clearTimeout(resume);
      resume = setTimeout(() => {
        pos = el.scrollLeft;
        paused = false;
      }, 1800);
    };

    raf = requestAnimationFrame(step);
    el.addEventListener('pointerdown', pause);
    el.addEventListener('wheel', pause, { passive: true });
    el.addEventListener('touchstart', pause, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resume);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('wheel', pause);
      el.removeEventListener('touchstart', pause);
    };
  }, []);

  if (images.length === 0) return null;

  return (
    <div
      ref={ref}
      className={`no-scrollbar flex gap-[10px] overflow-x-auto ${
        asGrid
          ? 'md:grid md:overflow-x-visible md:[grid-template-columns:repeat(var(--home-cols),minmax(0,1fr))]'
          : ''
      }`}
      style={asGrid ? ({ '--home-cols': images.length } as CSSProperties) : undefined}
    >
      {loop.map((img, i) => {
        const isDuplicate = i >= images.length;
        return (
          <Link
            key={i}
            href={img.href ?? href}
            // With a visible caption the link names itself; without one it
            // needs the section name.
            aria-label={img.label ? undefined : sectionLabel}
            aria-hidden={isDuplicate}
            tabIndex={isDuplicate ? -1 : undefined}
            className={[
              'group block shrink-0',
              // Exactly 2 cards across the padded viewport (100vw - 40px of
              // page padding, minus the single 10px gap between them).
              'w-[calc(50vw-25px)]',
              asGrid ? 'md:w-auto md:shrink' : 'sm:w-[220px]',
              // The wrap-around copies exist only for the scrolling strip.
              isDuplicate && asGrid ? 'md:hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {img.label && (
              <div className="type-h3 mb-[10px] truncate text-graphite transition-colors group-hover:text-redcurrent">
                {img.label}
              </div>
            )}
            <div className="relative aspect-[2/3] overflow-hidden bg-cloud/30">
              <Image
                src={img.url}
                alt={isDuplicate ? '' : img.alt}
                fill
                sizes={asGrid ? '(max-width: 768px) 50vw, 20vw' : '(max-width: 640px) 50vw, 220px'}
                className="img-bw object-cover transition-opacity group-hover:opacity-90"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
