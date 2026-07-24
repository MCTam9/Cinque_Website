'use client';

import { useEffect } from 'react';

/**
 * Mobile colour reveal for `.img-bw` images (touch devices only). Since touch
 * has no hover, images start greyscale and colourise under a moving finger:
 * the image directly beneath the touch point gets `.finger` (touchmove +
 * elementFromPoint), which reveals its colour (see globals.css).
 *
 * Deliberately touch-driven only. A scroll-position reveal (colourising
 * whatever crossed the centre band of the viewport) used to run alongside this
 * and was removed — it fired on every scroll regardless of intent, so the page
 * colourised itself as you passed through rather than answering to the reader.
 *
 * Desktop keeps the CSS hover behaviour; reduced-motion falls back to
 * always-colour and this effect no-ops. Mounted once in the site layout.
 */
export default function ImageColorReveal() {
  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isTouch || reduce) return;

    // Colourise the .img-bw directly under the moving finger.
    let fingerEl: Element | null = null;
    let queued = false;
    let x = 0;
    let y = 0;

    const update = () => {
      queued = false;
      const el = document.elementFromPoint(x, y)?.closest('.img-bw') ?? null;
      if (el === fingerEl) return;
      fingerEl?.classList.remove('finger');
      el?.classList.add('finger');
      fingerEl = el;
    };
    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      x = t.clientX;
      y = t.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    const clearFinger = () => {
      fingerEl?.classList.remove('finger');
      fingerEl = null;
    };

    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', clearFinger, { passive: true });
    document.addEventListener('touchcancel', clearFinger, { passive: true });

    return () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', clearFinger);
      document.removeEventListener('touchcancel', clearFinger);
    };
  }, []);

  return null;
}
