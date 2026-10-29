'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { replayFade } from '@/components/ImageColorReveal';

export type GalleryImage = { url: string; thumb: string; alt: string };

/**
 * PDP image gallery. The big photo is a track of every image that scrolls
 * one photo at a time:
 *
 *   • desktop — vertically, with ^ / v arrows centred at the photo's top and
 *     bottom, beside a scrolling thumbnail column. The track ignores the
 *     mouse wheel (overflow hidden), so the page still scrolls over it.
 *   • mobile — horizontally, with < / > arrows at the photo's left and right,
 *     and a native swipe that snaps to each photo; thumbnails sit below.
 *
 * The arrows (bare chevrons) sit 10px in from the photo's edges, the
 * page's standard gap. Moves
 * are smooth scrolls (instant under reduced motion), and the active
 * thumbnail follows whichever photo is showing, however it got there.
 *
 * Every slide loads up front, so its colour → black & white fade would play
 * out of sight. Instead each photo replays the fade as it starts to slide into
 * view, by arrow, thumbnail or swipe, and arrives in colour like the first.
 */
export default function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const thumbColumn = useRef<HTMLDivElement>(null);

  const count = images.length;
  const hasThumbs = count > 1;

  /** Whether the track runs vertically (desktop) rather than horizontally. */
  const vertical = () => {
    const el = track.current;
    return Boolean(el && getComputedStyle(el).flexDirection === 'column');
  };

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = track.current;
      if (!el) return;
      const index = Math.max(0, Math.min(count - 1, i));
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior: ScrollBehavior = smooth && !reduced ? 'smooth' : 'auto';
      if (vertical()) el.scrollTo({ top: index * el.clientHeight, behavior });
      else el.scrollTo({ left: index * el.clientWidth, behavior });
      setActive(index);
    },
    [count]
  );

  // A swipe (or any scroll) settles the active photo from the scroll position.
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = vertical()
      ? Math.round(el.scrollTop / el.clientHeight)
      : Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active && i >= 0 && i < count) setActive(i);
  };

  // Crossing the desktop/mobile breakpoint, or resizing, changes the photo's
  // size and the track's direction: put the active photo back in place.
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(() => goTo(activeRef.current, false));
    observer.observe(el);
    return () => observer.disconnect();
  }, [goTo]);

  // Replay the fade on a slide as it enters the photo frame. The first report
  // is only the starting state (photo 1 already fades on its own load). Not 0:
  // slides sit edge to edge, and edge-adjacent counts as intersecting at 0.
  useEffect(() => {
    const el = track.current;
    if (!el || count < 2) return;
    const visible = new Map<Element, boolean>();
    let first = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const now = entry.intersectionRatio > 0;
          if (now && !visible.get(entry.target) && !first) {
            const img = entry.target.querySelector('img.img-bw');
            if (img instanceof HTMLImageElement) replayFade(img);
          }
          visible.set(entry.target, now);
        }
        first = false;
      },
      { root: el, threshold: 0.01 }
    );
    Array.from(el.children).forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [count]);

  // Keep the active thumbnail in view in the desktop column, scrolling only
  // the column (never the page).
  useEffect(() => {
    const column = thumbColumn.current;
    const thumb = column?.children[active] as HTMLElement | undefined;
    if (!column || !thumb) return;
    const top = thumb.offsetTop;
    const bottom = top + thumb.offsetHeight;
    if (top < column.scrollTop) column.scrollTo({ top, behavior: 'smooth' });
    else if (bottom > column.scrollTop + column.clientHeight) {
      column.scrollTo({ top: bottom - column.clientHeight, behavior: 'smooth' });
    }
  }, [active]);

  if (count === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-cloud/30 type-p2 text-oslo">
        No image
      </div>
    );
  }

  const thumbClass = 'group relative aspect-[3/4] w-full overflow-hidden bg-cloud/30';

  // The active thumb is marked with an overlay rather than a ring or outline on
  // the button itself: the desktop column scrolls, so an outset ring is clipped
  // against its edges, and an inset ring or outline is painted underneath the
  // fill Image. This sits inside the box and after the image, so neither
  // happens.
  const activeMark = (
    <span aria-hidden className="pointer-events-none absolute inset-0 border border-graphite" />
  );

  return (
    <div className={`grid gap-[10px] ${hasThumbs ? 'md:grid-cols-[3fr_1fr]' : 'grid-cols-1'}`}>
      <div
        className="relative aspect-[3/4] w-full overflow-hidden bg-cloud/30"
        role="region"
        aria-roledescription="carousel"
        aria-label="Product images"
      >
        <div
          ref={track}
          onScroll={onScroll}
          className="no-scrollbar absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:snap-none md:flex-col md:overflow-hidden"
        >
          {images.map((img, i) => (
            <div
              key={img.url}
              className="group relative h-full w-full shrink-0 snap-start snap-always"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== active}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 45vw"
                className="img-bw object-cover"
              />
            </div>
          ))}
        </div>

        {hasThumbs && (
          <>
            {/* Desktop: ^ / v, centred on the top and bottom edges. */}
            <Arrow
              dir="up"
              label="Previous image"
              hidden={active === 0}
              onClick={() => goTo(active - 1)}
              className="left-1/2 top-0 hidden -translate-x-1/2 items-start justify-center pt-[10px] md:flex"
            />
            <Arrow
              dir="down"
              label="Next image"
              hidden={active === count - 1}
              onClick={() => goTo(active + 1)}
              className="bottom-0 left-1/2 hidden -translate-x-1/2 items-end justify-center pb-[10px] md:flex"
            />
            {/* Mobile: < / >, centred on the left and right edges. */}
            <Arrow
              dir="left"
              label="Previous image"
              hidden={active === 0}
              onClick={() => goTo(active - 1)}
              className="left-0 top-1/2 flex -translate-y-1/2 items-center justify-start pl-[10px] md:hidden"
            />
            <Arrow
              dir="right"
              label="Next image"
              hidden={active === count - 1}
              onClick={() => goTo(active + 1)}
              className="right-0 top-1/2 flex -translate-y-1/2 items-center justify-end pr-[10px] md:hidden"
            />
          </>
        )}
      </div>

      {/* Desktop: vertical scrolling thumbnail column */}
      {hasThumbs && (
        <div className="relative hidden md:block">
          <div
            ref={thumbColumn}
            className="thin-scrollbar absolute inset-0 flex flex-col gap-[10px] overflow-y-auto"
          >
            {images.map((img, i) => (
              <button
                key={img.thumb}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={i === active}
                className={`${thumbClass} shrink-0`}
              >
                <Image src={img.thumb} alt={img.alt} fill sizes="15vw" className="img-bw object-cover" />
                {i === active && activeMark}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: horizontal thumbnail grid below the main image */}
      {hasThumbs && (
        <div className="grid grid-cols-4 gap-[10px] md:hidden">
          {images.map((img, i) => (
            <button
              key={img.thumb}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              className={thumbClass}
            >
              <Image src={img.thumb} alt={img.alt} fill sizes="22vw" className="img-bw object-cover" />
              {i === active && activeMark}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Chevrons drawn edge to edge in their box, so the box's edge is the arrow's. */
const CHEVRON = {
  up: { box: [20, 11], points: '1,10 10,1 19,10' },
  down: { box: [20, 11], points: '1,1 10,10 19,1' },
  left: { box: [11, 20], points: '10,1 1,10 10,19' },
  right: { box: [11, 20], points: '1,1 10,10 1,19' },
} as const;

/**
 * A bare graphite chevron, terracotta on hover (mouse only: a tap would leave
 * it stuck). Its button is a 44px touch target sitting on the photo's edge,
 * padded so the arrow itself lands 10px in. It fades out (and can't be hit)
 * at the first or last photo.
 */
function Arrow({
  dir,
  label,
  hidden,
  onClick,
  className,
}: {
  dir: keyof typeof CHEVRON;
  label: string;
  hidden: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={`absolute z-10 h-[44px] w-[44px] text-graphite transition-[opacity,color] duration-300 motion-reduce:transition-none [@media(hover:hover)]:hover:text-redcurrent ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      } ${className}`}
    >
      <svg
        width={CHEVRON[dir].box[0]}
        height={CHEVRON[dir].box[1]}
        viewBox={`0 0 ${CHEVRON[dir].box.join(' ')}`}
        overflow="visible"
        aria-hidden
      >
        <polyline
          points={CHEVRON[dir].points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="square"
        />
      </svg>
    </button>
  );
}
