'use client';

import { useEffect } from 'react';

/**
 * Mobile colour reveal for `.img-bw` images (touch devices only). Since touch
 * has no hover, images start greyscale and colourise on contact:
 *
 *   • tap    — the tapped image stays in colour (`.tapped`), the way a desktop
 *     pointer resting on an image would. One at a time: tapping another image
 *     returns the previous one to grey, mirroring hover moving between images.
 *   • drag   — the image under a moving finger colourises as the finger passes
 *     (`.finger`), and reverts when it leaves.
 *
 * Crucially this never calls preventDefault, so a tap on an image inside a link
 * both reveals the colour and follows the link — colour is never a first tap
 * that costs the reader a second one.
 *
 * A scroll started on an image is not a tap: once the finger travels past
 * TAP_SLOP the gesture is treated as a drag, so scrolling the page doesn't
 * leave colour behind everywhere it began.
 *
 * Desktop keeps the CSS hover behaviour; reduced-motion falls back to
 * always-colour and this effect no-ops. Mounted once in the site layout.
 */

/** Finger travel (px) past which a touch is a scroll/drag rather than a tap. */
const TAP_SLOP = 10;

export default function ImageColorReveal() {
  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isTouch || reduce) return;

    // Transient: follows the finger. Sticky: stays after a tap.
    let fingerEl: Element | null = null;
    let tappedEl: Element | null = null;

    let startEl: Element | null = null;
    let startX = 0;
    let startY = 0;
    let moved = false;

    let queued = false;
    let x = 0;
    let y = 0;

    const setFinger = (el: Element | null) => {
      if (el === fingerEl) return;
      fingerEl?.classList.remove('finger');
      el?.classList.add('finger');
      fingerEl = el;
    };

    const update = () => {
      queued = false;
      setFinger(document.elementFromPoint(x, y)?.closest('.img-bw') ?? null);
    };

    const onStart = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
      const target = ev.target;
      startEl = target instanceof Element ? target.closest('.img-bw') : null;
      // Colour from first contact, so the reveal is visible even on a tap that
      // immediately navigates away.
      setFinger(startEl);
    };

    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      if (
        Math.abs(t.clientX - startX) > TAP_SLOP ||
        Math.abs(t.clientY - startY) > TAP_SLOP
      ) {
        moved = true;
      }
      x = t.clientX;
      y = t.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };

    const onEnd = () => {
      if (!moved && startEl) {
        if (tappedEl !== startEl) tappedEl?.classList.remove('tapped');
        startEl.classList.add('tapped');
        tappedEl = startEl;
      }
      setFinger(null);
      startEl = null;
    };

    const onCancel = () => {
      setFinger(null);
      startEl = null;
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, []);

  return null;
}
