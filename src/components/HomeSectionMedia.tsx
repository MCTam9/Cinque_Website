'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type MediaImage = { url: string; alt: string };

/**
 * A home section's imagery. 1–5 images render as a grid whose desktop column
 * count follows the image count (2 columns on mobile). 6+ images render as a
 * slow, continuously auto-scrolling strip the visitor can also scroll by hand
 * (mouse wheel / drag / touch) — auto-scroll pauses briefly on interaction and
 * is disabled under prefers-reduced-motion. Every image links to the section.
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
  if (images.length === 0) return null;

  if (images.length <= 5) {
    return (
      <div
        className="grid grid-cols-2 gap-[10px] md:[grid-template-columns:repeat(var(--home-cols),minmax(0,1fr))]"
        style={{ '--home-cols': images.length } as CSSProperties}
      >
        {images.map((img, i) => (
          <Link
            key={i}
            href={href}
            aria-label={label}
            className="group relative block aspect-[2/3] overflow-hidden bg-cloud/30"
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 50vw, 20vw"
              className="img-bw object-cover transition-opacity group-hover:opacity-90"
            />
          </Link>
        ))}
      </div>
    );
  }

  return <AutoScrollStrip images={images} href={href} label={label} />;
}

function AutoScrollStrip({
  images,
  href,
  label,
}: {
  images: MediaImage[];
  href: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
      if (!paused) {
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

  return (
    <div ref={ref} className="no-scrollbar flex gap-[10px] overflow-x-auto">
      {loop.map((img, i) => (
        <Link
          key={i}
          href={href}
          aria-label={label}
          aria-hidden={i >= images.length}
          tabIndex={i >= images.length ? -1 : undefined}
          className="group relative block aspect-[2/3] w-[45vw] shrink-0 overflow-hidden bg-cloud/30 sm:w-[220px]"
        >
          <Image
            src={img.url}
            alt={i < images.length ? img.alt : ''}
            fill
            sizes="(max-width: 768px) 45vw, 220px"
            className="img-bw object-cover"
          />
        </Link>
      ))}
    </div>
  );
}
