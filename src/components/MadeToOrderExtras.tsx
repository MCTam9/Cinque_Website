'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatGBP } from '@/lib/products';
import {
  ENGRAVING_MAX,
  ENGRAVING_PRICE_PENCE,
  NOTES_HINT,
  NOTES_MAX,
  engravable,
} from '@/lib/shop/madeToOrder';

/**
 * A collapsible option under the ring size: light grey until used, opens
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
  hint,
  filter = (text) => text,
}: {
  label: string;
  price?: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
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

  const tone = used ? 'border-redcurrent text-redcurrent' : 'border-oslo/50 text-oslo';
  const fieldClass = `type-p1 w-full bg-transparent text-graphite placeholder:text-oslo/70 focus:outline-none`;

  return (
    <div className={`border transition-colors ${tone}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`type-p1 flex min-h-[40px] w-full items-center justify-between px-[10px] text-left transition-colors ${
          used ? '' : 'hover:text-graphite'
        }`}
      >
        <span>{label}</span>
        {price && <span>{price}</span>}
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-[250ms] ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-[6px] px-[10px] pb-[10px]">
            <div className={`flex items-start gap-[10px] border px-[10px] py-[6px] ${tone}`}>
              {multiline ? (
                <textarea
                  ref={fieldRef}
                  value={value}
                  onChange={(e) => change(e.target.value)}
                  rows={3}
                  placeholder={placeholder}
                  aria-label={label}
                  tabIndex={open ? 0 : -1}
                  className={`${fieldClass} resize-none`}
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
              <span className="type-p2 shrink-0 pt-[2px] text-oslo" aria-live="polite">
                {count}/{max}
              </span>
            </div>
            {hint && <p className="type-p2 text-oslo">{hint}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Engraving (£30, 10 characters, where offered) and notes for a made-to-order ring. */
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
    <div className="flex flex-col gap-[10px]">
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
        placeholder="e.g. as agreed by email on 3 October"
        hint={NOTES_HINT}
      />
    </div>
  );
}
