'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type MediaImage = { url: string; alt: string };

/**
 * A home section's imagery.
 *
 * Mobile: always a slow, continuously auto-scrolling horizontal strip showing
 * ~2.5 images at a time — 2.5 rather than a whole number so the cut-off third
 * image reads as "there is more here" and invites the swipe.
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
  label,
}: {
  images: MediaImage[];
  href: string;
  label: string;
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
            href={href}
            aria-label={label}
            aria-hidden={isDuplicate}
            tabIndex={isDuplicate ? -1 : undefined}
            className={[
              'group relative block aspect-[2/3] shrink-0 overflow-hidden bg-cloud/30',
              // ~2.5 images across the padded viewport (100vw - 40px of page
              // padding, minus the two 10px gaps that precede the third).
              'w-[calc(40vw-24px)]',
              asGrid ? 'md:w-auto md:shrink' : 'sm:w-[220px]',
              // The wrap-around copies exist only for the scrolling strip.
              isDuplicate && asGrid ? 'md:hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Image
              src={img.url}
              alt={isDuplicate ? '' : img.alt}
              fill
              sizes={asGrid ? '(max-width: 768px) 40vw, 20vw' : '(max-width: 640px) 40vw, 220px'}
              className="img-bw object-cover transition-opacity group-hover:opacity-90"
            />
          </Link>
        );
      })}
    </div>
  );
}
