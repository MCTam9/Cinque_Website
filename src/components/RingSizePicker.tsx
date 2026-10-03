'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  RING_SIZE_OPTIONS,
  RING_SIZE_SYSTEMS,
  formatRingSize,
  nearestRingSize,
} from '@/lib/shop/ringSizes';

const ITEM_H = 40; // px per row
const VISIBLE = 5; // rows in view; the middle one is the selection
const PAD = ((VISIBLE - 1) / 2) * ITEM_H; // lets the first and last rows reach the middle

/**
 * One scroll-snap column of an iOS-style picker. Scrolling settles on a row,
 * tapping a row centres it, and Up/Down arrows step through it when focused.
 */
function Wheel({
  label,
  options,
  index,
  onChange,
  className = '',
}: {
  label: string;
  options: string[];
  index: number;
  onChange: (index: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const id = useId();

  // Bring the selected row to the middle whenever it changes from outside
  // (first render, a tap, an arrow key, or the other wheel converting it).
  useEffect(() => {
    const el = ref.current;
    if (!el || Math.round(el.scrollTop / ITEM_H) === index) {
      mounted.current = true;
      return;
    }
    el.scrollTo({ top: index * ITEM_H, behavior: mounted.current ? 'smooth' : 'auto' });
    mounted.current = true;
  }, [index]);

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  // Scroll events fire continuously; act once the snap has come to rest.
  const onScroll = () => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      if (i !== index) onChange(i);
    }, 100);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    onChange(Math.min(options.length - 1, Math.max(0, index + step)));
  };

  return (
    <div className={`relative ${className}`}>
      {/* The selection band, fixed in the middle row. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 border-y border-graphite"
        style={{ top: PAD, height: ITEM_H }}
      />
      <div
        ref={ref}
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`${id}-${index}`}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] focus:outline-none focus-visible:ring-1 focus-visible:ring-redcurrent [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(transparent,black_35%,black_65%,transparent)]"
        style={{ height: ITEM_H * VISIBLE, paddingBlock: PAD }}
      >
        {options.map((o, i) => (
          <div
            key={o}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === index}
            onClick={() => onChange(i)}
            className={`type-p1 flex cursor-pointer snap-center items-center justify-center transition-colors ${
              i === index ? 'text-graphite' : 'text-oslo'
            }`}
            style={{ height: ITEM_H }}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

const INITIAL = {
  systemIndex: 0,
  sizeIndex: RING_SIZE_OPTIONS.UK.findIndex((o) => o.label === 'N'),
};

type Pick = typeof INITIAL;

/**
 * Made-to-order ring size. A single row on the page; tapping it opens a sheet
 * (bottom of the screen on phones, centred on desktop) with two wheels: size
 * system on the left, its sizes on the right.
 *
 * The wheels live behind a tap so a thumb scrolling the page can never land
 * on a size. Nothing is recorded until Done — a made-to-order piece can't be
 * returned — and closing any other way discards the change. Switching system
 * converts through circumference from the size last picked by hand, so
 * flicking UK → US → JP doesn't drift through rounding.
 */
export default function RingSizePicker({ onChange }: { onChange: (size: string) => void }) {
  const [picked, setPicked] = useState<Pick | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Pick>(INITIAL);
  const [anchorCirc, setAnchorCirc] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const value = picked
    ? formatRingSize(
        RING_SIZE_SYSTEMS[picked.systemIndex],
        RING_SIZE_OPTIONS[RING_SIZE_SYSTEMS[picked.systemIndex]][picked.sizeIndex].label
      )
    : '';

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  // Open before the wheels' effects run, so they can scroll a visible list.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    // The page behind must not scroll while the sheet is up (iOS ignores the
    // modal for this).
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const show = () => {
    const start = picked ?? INITIAL;
    setDraft(start);
    setAnchorCirc(RING_SIZE_OPTIONS[RING_SIZE_SYSTEMS[start.systemIndex]][start.sizeIndex].circ);
    setOpen(true);
  };

  const system = RING_SIZE_SYSTEMS[draft.systemIndex];
  const options = RING_SIZE_OPTIONS[system];

  const changeSystem = (i: number) =>
    setDraft({ systemIndex: i, sizeIndex: nearestRingSize(RING_SIZE_SYSTEMS[i], anchorCirc) });

  const changeSize = (i: number) => {
    setDraft((d) => ({ ...d, sizeIndex: i }));
    setAnchorCirc(options[i].circ);
  };

  const done = () => {
    setPicked(draft);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-[6px]">
      <span className="type-p1 text-oslo">Your size</span>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        className="type-p1 flex min-h-[40px] w-full items-center justify-between border border-graphite px-[10px] text-left transition-colors hover:border-redcurrent"
      >
        <span className={picked ? 'text-graphite' : 'text-oslo'}>
          {picked ? value : 'Choose your size'}
        </span>
        <span className="text-oslo">{picked ? 'Change' : '+'}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        // A click on the dialog element itself is a click on the backdrop.
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none border-0 border-t border-graphite bg-cararra p-0 text-graphite backdrop:bg-graphite/40 md:inset-0 md:m-auto md:h-fit md:max-w-md md:border"
      >
        {open && (
          <div className="flex flex-col gap-[20px] px-[20px] pt-[20px] pb-[max(20px,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <span id={titleId} className="type-h3">
                Your size
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="type-p1 text-oslo underline underline-offset-4 hover:text-redcurrent"
              >
                Cancel
              </button>
            </div>
            <div className="flex border border-graphite">
              <Wheel
                label="Size system"
                options={[...RING_SIZE_SYSTEMS]}
                index={draft.systemIndex}
                onChange={changeSystem}
                className="w-1/3 border-r border-graphite"
              />
              <Wheel
                key={system}
                label={`${system} ring size`}
                options={options.map((o) => o.label)}
                index={draft.sizeIndex}
                onChange={changeSize}
                className="flex-1"
              />
            </div>
            <button
              type="button"
              onClick={done}
              className="type-h3 min-h-[48px] bg-graphite text-cararra transition-colors hover:bg-redcurrent"
            >
              Done · {formatRingSize(system, options[draft.sizeIndex].label)}
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
