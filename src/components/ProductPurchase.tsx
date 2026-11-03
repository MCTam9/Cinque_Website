'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import { CUSTOM_SIZE_MAX, ENGRAVING_PRICE_PENCE, MADE_TO_ORDER_LINE } from '@/lib/shop/madeToOrder';
import { H3, P1 } from '@/components/typography';
import { RING_SIZE_CHART_ID } from '@/components/RingSizeChart';
import RingSizePicker from '@/components/RingSizePicker';
import { EngravingOption, NotesOption } from '@/components/MadeToOrderExtras';
import { LARGE_SIZE_LETTERS, ringSizeCharge, type LargeSizes } from '@/lib/shop/ringSizes';
import { IN_STOCK_LINE, formatPence } from '@/lib/shop/shipping';

export interface PurchaseVariant {
  key: string;
  sku: string;
  /** e.g. "9ct Yellow Gold"; groups the variants into the Material choice. */
  material?: string;
  /** Its stone, e.g. "Pearl": named after the material in its box. */
  stone?: string;
  /** A stocked size, e.g. "M"; none for made to order. */
  size?: string;
  /** What the cart line and order add to the title, e.g. "14ct Gold" (see variantDetail). */
  detail?: string;
  /** A made-to-order ring's sizes above UK T and their surcharge, if it offers them. */
  largeSizes?: LargeSizes | null;
  label: string; // full label for a11y
  priceGBP: number;
  inStock: boolean;
  /** Made to order: the customer types their own size; never stock-limited. */
  madeToOrder: boolean;
}

/**
 * One label/value row, as on the product card: label left, value right. A
 * choice has no value: its buttons (`children`) go on the line below, the
 * picked one showing what's chosen.
 */
function SpecRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-[10px] type-p1">
      <dt className="text-oslo">{label}</dt>
      {value !== undefined && <dd className="text-right text-graphite">{value}</dd>}
      {/* 10px above the buttons, and below them unless the list ends here,
          the same rhythm as the made-to-order fields underneath. */}
      {children && (
        <dd className="col-span-2 pt-[10px] [div:not(:last-child)>&]:pb-[10px]">{children}</dd>
      )}
    </div>
  );
}

export interface Spec {
  label: string;
  value: ReactNode;
}

/** The PDP's spec rows on their own, for a product with nothing to buy. */
export function SpecList({ specs }: { specs: Spec[] }) {
  return (
    <dl className="flex flex-col gap-0.5">
      {specs.map((s) => (
        <SpecRow key={s.label} {...s} />
      ))}
    </dl>
  );
}

interface Option {
  id: string;
  text: string;
  selected: boolean;
  available: boolean;
  onSelect: () => void;
  /** Picking it unfolds the group's panel (Made to Order). */
  opensPanel?: boolean;
}

/**
 * A choice as one box: its options share a border, split by hairlines (a
 * column for long names like materials, a row for sizes), and a red outline
 * (1.5px, a touch heavier than the hairlines) slides to the picked one. Sold-out options are struck through. Where an
 * option opens a `panel` (Made to Order's size and extras), picking it
 * unfolds the panel under the box and the outline takes in both, like a tab;
 * that option goes last, so the tab sits on the box's bottom edge.
 */
function OptionGroup({
  label,
  options,
  column = false,
  panel,
}: {
  label: string;
  options: Option[];
  column?: boolean;
  panel?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const panelRef = useRef<HTMLDivElement>(null);
  const picked = options.find((o) => o.selected);
  const pickedId = picked?.id;
  const open = Boolean(panel && picked?.opensPanel);
  const [outline, setOutline] = useState<Rect | null>(null);
  const [slide, setSlide] = useState(false);
  const layout = options.map((o) => o.id).join(' ');

  // Lay the outline over the picked option (1px out, over the hairlines),
  // and again whenever the box changes size. Measured unrounded: offsetLeft
  // and offsetWidth are whole pixels, which leaves a sliver of the grey line
  // showing beside the red at fractional widths or browser zoom.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const place = () => {
      const b = pickedId && buttons.current.get(pickedId);
      if (!b) return setOutline(null);
      const outer = el.getBoundingClientRect();
      const r = b.getBoundingClientRect();
      setOutline({
        left: r.left - outer.left - el.clientLeft - 1,
        top: r.top - outer.top - el.clientTop - 1,
        width: r.width + 2,
        height: r.height + 2,
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pickedId, layout]);

  // Placed without motion on load; from then on it slides.
  useEffect(() => {
    if (!outline || slide) return;
    const frame = requestAnimationFrame(() => setSlide(true));
    return () => cancelAnimationFrame(frame);
  }, [outline, slide]);

  // A folded panel's fields stay out of the tab order.
  useEffect(() => {
    if (panelRef.current) panelRef.current.inert = !open;
  }, [open]);

  return (
    <div>
      <div
        ref={box}
        role="radiogroup"
        aria-label={label}
        // The hairlines are the background showing between options; it stops
        // at the border, so an open panel can take the bottom edge away.
        className={`relative flex gap-px border border-graphite bg-graphite bg-clip-padding transition-colors ${
          column ? 'flex-col' : ''
        } ${open ? 'border-b-transparent' : ''}`}
      >
        {options.map((o) => (
          <button
            key={o.id}
            ref={(el) => {
              if (el) buttons.current.set(o.id, el);
              else buttons.current.delete(o.id);
            }}
            type="button"
            role="radio"
            aria-checked={o.selected}
            onClick={o.onSelect}
            disabled={!o.available}
            className={`type-p1 flex min-h-[40px] flex-1 items-center justify-center whitespace-nowrap bg-cararra px-[10px] transition-colors ${
              o.selected ? 'text-redcurrent' : 'text-graphite hover:text-redcurrent'
            } disabled:cursor-not-allowed disabled:text-oslo disabled:line-through`}
          >
            {o.text}
          </button>
        ))}
        {outline && (
          <>
            {/* The open panel's top edge, under the options before the picked
                one, up to the outline. Drawn only where it shows, never over
                another line, so no grey peeks through at the joins. */}
            <span
              aria-hidden
              style={{ left: -1, width: outline.left + 2 }}
              className={`pointer-events-none absolute -bottom-px h-[1.5px] bg-redcurrent ${
                open ? 'opacity-100' : 'opacity-0'
              } ${
                slide
                  ? 'transition-[width,opacity] duration-[250ms] ease-out motion-reduce:transition-none'
                  : ''
              }`}
            />
            {/* Open at the bottom, into the panel. */}
            <span
              aria-hidden
              style={outline}
              className={`pointer-events-none absolute border-[1.5px] border-redcurrent ${
                open ? 'border-b-0' : ''
              } ${
                slide
                  ? 'transition-[left,top,width,height] duration-[250ms] ease-out motion-reduce:transition-none'
                  : ''
              }`}
            />
          </>
        )}
      </div>
      {panel && (
        <div
          className={`grid transition-[grid-template-rows] duration-[250ms] ease-out motion-reduce:transition-none ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div
              ref={panelRef}
              className="border-x-[1.5px] border-b-[1.5px] border-redcurrent p-[10px]"
            >
              {panel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A variant's place in the Size choice. */
const sizeOf = (v: PurchaseVariant) => (v.madeToOrder ? 'Made to Order' : (v.size ?? v.sku));

/**
 * PDP purchase panel (Figma). The product's spec rows (Drop, Edition) run
 * straight on into its choices, Material then Size, so the whole block reads
 * as one list in the card's order. Each choice is one box under its label
 * (see OptionGroup), the picked option outlined in red, even when there's
 * only one to pick: the box is the value, never repeated beside the label. A
 * material names its stone after the metal ("14ct Yellow Gold, Pearl"), as
 * the card does.
 *
 * Picking Made to Order unfolds its panel under the Size box: the required
 * size (a UK/US/EU/JP wheel for rings, free text otherwise) and, on rings, a
 * paid engraving where the Admin offers one. A ring with larger sizes (UK U
 * and up) adds their surcharge when one is picked. A made-to-order ring's
 * notes follow the Size box. Below, the dispatch time sits beside the price,
 * over the Add to cart button, which waits until a size is given.
 */
export default function ProductPurchase({
  productId,
  title,
  specs = [],
  variants,
  imageUrl,
  ring = false,
  engraving: offerEngraving = false,
}: {
  productId: string;
  title: string;
  /** Rows above the choices, e.g. Drop and Edition. */
  specs?: Spec[];
  variants: PurchaseVariant[];
  imageUrl?: string;
  /** Rings: pick the size on a UK/US/EU/JP wheel (not free text) and link the chart below. */
  ring?: boolean;
  /** Ring with "Offer engraving" on in the Admin: made to order can add a £30 engraving. */
  engraving?: boolean;
}) {
  const addLine = useCart((s) => s.addLine);
  const router = useRouter();
  const firstAvailable = variants.find((v) => v.inStock) ?? variants[0];
  const [selectedKey, setSelectedKey] = useState(firstAvailable?.key);
  const [customSize, setCustomSize] = useState('');
  const [engraving, setEngraving] = useState('');
  const [notes, setNotes] = useState('');

  const selected = variants.find((v) => v.key === selectedKey) ?? firstAvailable;

  // Material, then Size within the selected material.
  const materials = [...new Set(variants.map((v) => v.material).filter((m): m is string => !!m))];
  const ofMaterial = variants.filter((v) => v.material === selected?.material);
  const showSize = ofMaterial.length > 1 || ofMaterial.some((v) => v.madeToOrder || v.size);

  // The stone a material's box names: the picked piece's, else its first.
  const stoneIn = (material: string) =>
    (selected?.material === material ? selected : variants.find((v) => v.material === material))
      ?.stone;

  // A new material keeps the size where it can, else its first piece in stock.
  const pickMaterial = (material: string) => {
    const options = variants.filter((v) => v.material === material);
    const next =
      options.find((v) => v.inStock && selected && sizeOf(v) === sizeOf(selected)) ??
      options.find((v) => v.inStock) ??
      options[0];
    if (next) setSelectedKey(next.key);
  };

  const largeSizes = selected?.largeSizes ?? null;
  const size = customSize.trim();
  const needsSize = Boolean(selected?.madeToOrder);
  // Notes exist on any made-to-order ring; engraving only where the Admin offers it.
  const extras = needsSize && ring;
  const engravingText = extras && offerEngraving ? engraving.trim() : '';
  const notesText = extras ? notes.trim() : '';
  const engravingGBP = engravingText ? ENGRAVING_PRICE_PENCE : 0;
  // What the checkout API will charge for this size (UK U and up).
  const largeSizeGBP =
    needsSize && ring && size ? ringSizeCharge(size, largeSizes).surchargeGBP : 0;
  // A ring size must be one this variant offers (a material switch can take
  // away the larger ones).
  const sizeOk = !needsSize || (size.length > 0 && (!ring || ringSizeCharge(size, largeSizes).ok));
  const canAdd = Boolean(selected?.inStock) && sizeOk;

  const handleAdd = () => {
    if (!selected || !canAdd) return;
    addLine({
      productId,
      variantKey: selected.key,
      sku: selected.sku,
      title: selected.detail ? `${title} — ${selected.detail}` : title,
      unitPriceGBP: selected.priceGBP,
      quantity: 1,
      imageUrl,
      ...(needsSize ? { madeToOrder: true, customSize: size } : {}),
      ...(largeSizeGBP ? { largeSizeGBP } : {}),
      ...(engravingText ? { engraving: engravingText, engravingGBP } : {}),
      ...(notesText ? { notes: notesText } : {}),
    });
    // Jump to the cart, which shows the "added" confirmation.
    router.push(`/cart?added=${encodeURIComponent(title)}`);
  };

  // Stocked sizes first; Made to Order last, where its panel opens.
  const sizes = [...ofMaterial].sort((a, b) => Number(a.madeToOrder) - Number(b.madeToOrder));

  // What Made to Order unfolds: the size (required, dark) with the larger-size
  // note and the size chart under it, then on rings the optional engraving in
  // a grey box. Notes go under the Size box, outside the panel.
  const madeToOrder = (
    <div className="flex flex-col gap-[10px]">
      {/* Each box turns red once it's filled in, like a picked option. */}
      <div className={`border transition-colors ${size ? 'border-redcurrent' : 'border-graphite'}`}>
        {ring ? (
          <RingSizePicker onChange={setCustomSize} largeSizes={largeSizes} />
        ) : (
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            maxLength={CUSTOM_SIZE_MAX}
            required
            aria-label="Your size"
            placeholder="Your size, e.g. 45cm"
            className={`type-p1 min-h-[40px] w-full bg-transparent px-[10px] placeholder:text-graphite focus:outline-none ${
              size ? 'text-redcurrent' : 'text-graphite'
            }`}
          />
        )}
      </div>
      {ring && largeSizes && (
        <p className="type-p2 text-oslo">
          {`Sizes ${LARGE_SIZE_LETTERS[0]}–${largeSizes.upTo}${
            largeSizes.surchargeGBP
              ? ` add ${formatPence(largeSizes.surchargeGBP)} for the extra gold`
              : ' are made to order too'
          }.`}
        </p>
      )}
      {ring && (
        <a
          href={`#${RING_SIZE_CHART_ID}`}
          className="type-p1 w-fit text-oslo underline underline-offset-4 hover:text-redcurrent"
        >
          Ring size chart
        </a>
      )}
      {extras && offerEngraving && (
        <div
          className={`border transition-colors ${
            engraving.trim() ? 'border-redcurrent' : 'border-oslo/50'
          }`}
        >
          <EngravingOption value={engraving} onChange={setEngraving} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-[20px]">
      <dl className="flex flex-col gap-0.5">
        {specs.map((spec) => (
          <SpecRow key={spec.label} {...spec} />
        ))}
        {materials.length > 0 && (
          <SpecRow label="Material">
            <OptionGroup
              label="Material"
              column
              options={materials.map((m) => ({
                id: m,
                text: [m, stoneIn(m)].filter(Boolean).join(', '),
                selected: m === selected?.material,
                available: variants.some((v) => v.material === m && v.inStock),
                onSelect: () => pickMaterial(m),
              }))}
            />
          </SpecRow>
        )}
        {showSize && selected && (
          <SpecRow label="Size">
            <OptionGroup
              label="Size"
              column={sizes.length > 4}
              options={sizes.map((v) => ({
                id: v.key,
                text: sizeOf(v),
                selected: v.key === selected.key,
                available: v.inStock,
                onSelect: () => setSelectedKey(v.key),
                opensPanel: v.madeToOrder,
              }))}
              panel={madeToOrder}
            />
          </SpecRow>
        )}
      </dl>

      {/* Notes sit apart from the size and engraving: they're about an agreed
          change to the order, not part of choosing the piece. */}
      {extras && (
        <div className="border border-oslo/50">
          <NotesOption value={notes} onChange={setNotes} />
        </div>
      )}

      <div className="flex items-baseline justify-between gap-[10px]">
        {selected?.inStock && (
          <P1 className="text-graphite">{needsSize ? MADE_TO_ORDER_LINE : IN_STOCK_LINE}</P1>
        )}
        <H3 as="p" className="ml-auto shrink-0 text-right">
          {selected ? formatGBP(selected.priceGBP + engravingGBP + largeSizeGBP) : '—'}
        </H3>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        // Matches the size sheet's Done button: solid graphite, red on hover.
        className="type-h3 min-h-[48px] w-full bg-graphite text-cararra transition-colors hover:bg-redcurrent disabled:bg-oslo disabled:hover:bg-oslo"
      >
        {!selected?.inStock
          ? 'Sold out'
          : needsSize && !size
            ? ring
              ? 'Choose your size'
              : 'Enter your size'
            : 'Add to cart'}
      </button>
    </div>
  );
}
