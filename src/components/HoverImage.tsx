import Image from 'next/image';

/**
 * Brand image treatment: black & white by default, full colour on hover.
 * The `.img-bw` class (globals.css) handles the grayscale transition, shows
 * colour on touch devices (no hover), and respects reduced-motion.
 *
 * Renders with `fill`, so the parent must be positioned and sized.
 * Wrap in a group and pass `group-hover` behaviour via the parent if you want
 * the whole card to trigger the colour reveal.
 */
export default function HoverImage({
  src,
  alt,
  sizes = '(max-width: 768px) 50vw, 25vw',
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`img-bw object-cover ${className}`.trim()}
    />
  );
}
