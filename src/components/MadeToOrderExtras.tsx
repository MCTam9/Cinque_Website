'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { formatGBP } from '@/lib/products';
import {
  ENGRAVING_MAX,
  ENGRAVING_PRICE_PENCE,
  NOTES_HINT,
  NOTES_MAX,
  engravable,
} from '@/lib/shop/madeToOrder';

/**
 * A collapsible row of the made-to-order list, under the ring size: opens
 * downwards on tap to show its field, and turns red once something is
 * entered. Closing it clears the field, so tapping the header again is how a
 * buyer takes the option (and its price) back off.
 */
function OptionPanel({
  label,
  price,
  value,
  onChange,
  max,
  multiline = false,
  placeholder,
  filter = (text) => text,
}: {
  label: string;
  price?: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  multiline?: boolean;
  placeholder?: string;
  /** Applied to every keystroke and paste before the length cap. */
  filter?: (text: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const panelId = useId();
  const used = value.trim().length > 0;
  const count = [...value].length;

  // Focus the field once it opens; preventScroll so the page doesn't jump
  // while the panel is still growing.
  useEffect(() => {
    if (open) fieldRef.current?.focus({ preventScroll: true });
  }, [open]);

  const toggle = () => {
    if (open) onChange('');
    setOpen(!open);
  };

  const change = (text: string) => onChange([...filter(text)].slice(0, max).join(''));

  // Notes grow with what's typed (from 3 lines) rather than scrolling.
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!multiline || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [multiline, value]);

  const counter = (
    <span className="type-p2 ml-auto shrink-0 pt-[2px] text-oslo" aria-live="polite">
      {count}/{max}
    </span>
  );

  const fieldClass = `type-p1 w-full bg-transparent px-0 text-graphite placeholder:text-oslo focus:outline-none`;

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        // Grey until opened, as it's optional; red once something's entered.
        className={`type-p1 flex min-h-[40px] w-full items-center justify-between px-[10px] text-left transition-colors ${
          used ? 'text-redcurrent' : open ? 'text-graphite' : 'text-oslo hover:text-graphite'
        }`}
      >
        <span>{label}</span>
        <span>
          {price && `${price} `}
          {open ? '−' : '+'}
        </span>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-[250ms] ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-[6px] px-[10px] pb-[10px]">
            {/* One underline, like the contact form's fields: grey until
                something's typed, then red. */}
            <div
              className={`flex items-end gap-[10px] border-b py-[6px] transition-colors ${
                used ? 'border-redcurrent' : 'border-oslo/50'
              }`}
            >
              {multiline ? (
                <textarea
                  ref={fieldRef}
                  value={value}
                  onChange={(e) => change(e.target.value)}
                  rows={3}
                  placeholder={placeholder}
                  aria-label={label}
                  tabIndex={open ? 0 : -1}
                  className={`${fieldClass} resize-none overflow-hidden`}
                />
              ) : (
                <input
                  ref={fieldRef}
                  type="text"
                  value={value}
                  onChange={(e) => change(e.target.value)}
                  placeholder={placeholder}
                  aria-label={label}
                  tabIndex={open ? 0 : -1}
                  autoComplete="off"
                  className={`${fieldClass} min-h-[28px]`}
                />
              )}
              {/* A one-line field keeps its count beside it; notes get the
                  full width, with the count under them. */}
              {!multiline && counter}
            </div>
            {multiline && counter}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Engraving (£30, 16 characters, where offered) and notes for a made-to-order
 * ring: rows to sit in the made-to-order list under the size.
 */
export default function MadeToOrderExtras({
  offerEngraving,
  engraving,
  onEngravingChange,
  notes,
  onNotesChange,
}: {
  offerEngraving: boolean;
  engraving: string;
  onEngravingChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}) {
  return (
    <>
      {offerEngraving && (
        <OptionPanel
          label="Engraving"
          price={formatGBP(ENGRAVING_PRICE_PENCE)}
          value={engraving}
          onChange={onEngravingChange}
          max={ENGRAVING_MAX}
          placeholder={`${ENGRAVING_MAX} characters`}
          filter={engravable}
        />
      )}
      <OptionPanel
        label="Notes"
        value={notes}
        onChange={onNotesChange}
        max={NOTES_MAX}
        multiline
        placeholder={NOTES_HINT}
      />
    </>
  );
}
