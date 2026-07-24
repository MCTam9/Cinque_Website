'use client';

import { useState } from 'react';
import Image from 'next/image';

export type GalleryImage = { url: string; thumb: string; alt: string };

/**
 * PDP image gallery. Clicking a thumbnail swaps the main image; the active
 * thumb is highlighted. Desktop = main + vertical scrolling thumb column;
 * mobile = main + horizontal thumb grid (wraps, so all images are reachable).
 */
export default function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-cloud/30 type-p2 text-oslo">
        No image
      </div>
    );
  }

  const hasThumbs = images.length > 1;
  const main = images[Math.min(active, images.length - 1)];

  const thumbClass = (i: number) =>
    `group relative aspect-[3/4] w-full overflow-hidden bg-cloud/30 ${
      i === active ? 'ring-1 ring-graphite' : ''
    }`;

  return (
    <div className={`grid gap-[10px] ${hasThumbs ? 'md:grid-cols-[3fr_1fr]' : 'grid-cols-1'}`}>
      <div className="group relative aspect-[3/4] w-full overflow-hidden bg-cloud/30">
        <Image
          src={main.url}
          alt={main.alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 45vw"
          className="img-bw object-cover"
        />
      </div>

      {/* Desktop: vertical scrolling thumbnail column */}
      {hasThumbs && (
        <div className="relative hidden md:block">
          <div className="absolute inset-0 flex flex-col gap-[10px] overflow-y-auto">
            {images.map((img, i) => (
              <button
                key={img.thumb}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={i === active}
                className={`${thumbClass(i)} shrink-0`}
              >
                <Image src={img.thumb} alt={img.alt} fill sizes="15vw" className="img-bw object-cover" />
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
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              className={thumbClass(i)}
            >
              <Image src={img.thumb} alt={img.alt} fill sizes="22vw" className="img-bw object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
