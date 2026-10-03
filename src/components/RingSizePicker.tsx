'use client';

import { useEffect, useId, useRef, useState } from 'react';
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

/**
 * Made-to-order ring size: size system on the left, its sizes on the right.
 *
 * Reports "" until the buyer has actually picked a size — a made-to-order
 * piece can't be returned, so the wheel's resting position must never be
 * mistaken for a choice. Switching system keeps the same finger size by
 * converting through circumference.
 */
export default function RingSizePicker({ onChange }: { onChange: (size: string) => void }) {
  const [systemIndex, setSystemIndex] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(() => nearestRingSize('UK', 53.1)); // UK N
  const [chosen, setChosen] = useState(false);

  const system = RING_SIZE_SYSTEMS[systemIndex];
  const options = RING_SIZE_OPTIONS[system];
  const value = chosen ? formatRingSize(system, options[sizeIndex].label) : '';

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  const changeSystem = (i: number) => {
    const circ = options[sizeIndex].circ;
    setSystemIndex(i);
    setSizeIndex(nearestRingSize(RING_SIZE_SYSTEMS[i], circ));
  };

  const changeSize = (i: number) => {
    setSizeIndex(i);
    setChosen(true);
  };

  return (
    <div className="flex flex-col gap-[6px]">
      <span className="type-p1 text-oslo">Your size</span>
      <div className="flex border border-graphite">
        <Wheel
          label="Size system"
          options={[...RING_SIZE_SYSTEMS]}
          index={systemIndex}
          onChange={changeSystem}
          className="w-1/3 border-r border-graphite"
        />
        <Wheel
          key={system}
          label={`${system} ring size`}
          options={options.map((o) => o.label)}
          index={sizeIndex}
          onChange={changeSize}
          className="flex-1"
        />
      </div>
      <span className="type-p1 text-oslo" aria-live="polite">
        {chosen ? `Selected: ${value}` : 'Scroll or tap to choose your size'}
      </span>
    </div>
  );
}
