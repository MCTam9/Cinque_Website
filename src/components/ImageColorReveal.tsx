'use client';

import { useEffect } from 'react';

/**
 * Mobile colour reveal for `.img-bw` images (touch devices only). Since touch
 * has no hover, images start greyscale and colourise via two combined signals:
 *
 *   • in-view — an image crossing the centre band of the viewport (scroll) gets
 *     `.in-view` (IntersectionObserver).
 *   • finger  — the image directly under a moving finger gets `.finger`
 *     (touchmove + elementFromPoint).
 *
 * Either signal reveals colour (see `.img-bw.in-view/.finger` in globals.css).
 * Desktop keeps the CSS hover behaviour; reduced-motion falls back to
 * always-colour and this effect no-ops. Mounted once in the site layout.
 */
export default function ImageColorReveal() {
  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isTouch || reduce) return;

    // 1) In-view reveal — colourise images crossing the centre ~40% band.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle('in-view', e.isIntersecting);
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 }
    );
    document.querySelectorAll('.img-bw').forEach((el) => io.observe(el));

    // Re-observe images added later (route changes, gallery / lookbook swaps).
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches('.img-bw')) io.observe(n);
          n.querySelectorAll('.img-bw').forEach((el) => io.observe(el));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // 2) Finger reveal — colourise the .img-bw directly under the moving finger.
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
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', clearFinger);
      document.removeEventListener('touchcancel', clearFinger);
    };
  }, []);

  return null;
}
