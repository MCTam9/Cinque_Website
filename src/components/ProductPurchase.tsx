'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import { CUSTOM_SIZE_MAX, ENGRAVING_PRICE_PENCE, MADE_TO_ORDER_LINE } from '@/lib/shop/madeToOrder';
import { H3, P1 } from '@/components/typography';
import { RING_SIZE_CHART_ID } from '@/components/RingSizeChart';
import RingSizePicker from '@/components/RingSizePicker';
import MadeToOrderExtras from '@/components/MadeToOrderExtras';
import { LARGE_SIZE_LETTERS, ringSizeCharge, type LargeSizes } from '@/lib/shop/ringSizes';
import { IN_STOCK_LINE, formatPence } from '@/lib/shop/shipping';

export interface PurchaseVariant {
  key: string;
  sku: string;
  /** e.g. "9ct Gold"; groups the variants into the Material choice. */
  material?: string;
  /** A stocked size, e.g. "M"; none for made to order. */
  size?: string;
  /** What the cart line and order add to the title, e.g. "14ct Gold" (see variantDetail). */
  detail?: string;
  label: string; // full label for a11y
  priceGBP: number;
  inStock: boolean;
  /** Made to order: the customer types their own size; never stock-limited. */
  madeToOrder: boolean;
}

/**
 * One label/value row, as on the product card: label left, value right. A
 * choice's buttons (`children`) go on the line below it.
 */
function SpecRow({
  label,
  value,
  children,
}: {
  label: string;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-[10px] type-p1">
      <dt className="text-oslo">{label}</dt>
      <dd className="text-right text-graphite">{value}</dd>
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

/**
 * A choice's buttons, sized like the size picker's box below them (40px tall,
 * 10px in) and sharing the row's width: red when picked, struck through when
 * sold out.
 */
function OptionButtons({
  label,
  options,
}: {
  label: string;
  options: {
    id: string;
    text: string;
    selected: boolean;
    available: boolean;
    onSelect: () => void;
  }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-[10px]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={o.onSelect}
          disabled={!o.available}
          aria-pressed={o.selected}
          className={`type-p1 flex min-h-[40px] flex-1 items-center justify-center whitespace-nowrap border px-[10px] transition-colors ${
            o.selected
              ? 'border-redcurrent text-redcurrent'
              : 'border-graphite text-graphite hover:border-redcurrent'
          } disabled:cursor-not-allowed disabled:border-oslo disabled:text-oslo disabled:line-through`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

/** A variant's place in the Size choice. */
const sizeOf = (v: PurchaseVariant) => (v.madeToOrder ? 'Made to Order' : (v.size ?? v.sku));

/**
 * PDP purchase panel (Figma). The product's spec rows (Drop, Edition) run
 * straight on into its choices, Material then Size, in the same label/value
 * rows, so the whole block reads as one list in the card's order. A choice
 * with more than one option puts its square buttons under its row; with one,
 * it's just the row. The price sits right-aligned over the Add to cart button.
 *
 * Under the choices: the dispatch time for an in-stock piece, or for made to
 * order the lead time and a required size: a UK/US/EU/JP wheel for rings,
 * free text otherwise. Made-to-order rings also take notes, and a paid
 * engraving where the Admin offers one. A ring with larger sizes (UK U and
 * up) adds their surcharge when one is picked. Add to cart waits until a
 * size is given.
 */
export default function ProductPurchase({
  productId,
  title,
  specs = [],
  variants,
  imageUrl,
  ring = false,
  engraving: offerEngraving = false,
  largeSizes = null,
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
  /** Ring sizes above UK T offered in the Admin, and their surcharge. */
  largeSizes?: LargeSizes | null;
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

  // A new material keeps the size where it can, else its first piece in stock.
  const pickMaterial = (material: string) => {
    const options = variants.filter((v) => v.material === material);
    const next =
      options.find((v) => v.inStock && selected && sizeOf(v) === sizeOf(selected)) ??
      options.find((v) => v.inStock) ??
      options[0];
    if (next) setSelectedKey(next.key);
  };

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
  const canAdd = Boolean(selected?.inStock) && (!needsSize || size.length > 0);

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

  return (
    <div className="flex flex-col gap-[20px]">
      {/* The choices and what follows from them, in one 10px rhythm. */}
      <div className="flex flex-col gap-[10px]">
        <dl className="flex flex-col gap-0.5">
          {specs.map((spec) => (
            <SpecRow key={spec.label} {...spec} />
          ))}
          {materials.length > 0 && (
            <SpecRow label="Material" value={selected?.material}>
              {materials.length > 1 && (
                <OptionButtons
                  label="Material"
                  options={materials.map((m) => ({
                    id: m,
                    text: m,
                    selected: m === selected?.material,
                    available: variants.some((v) => v.material === m && v.inStock),
                    onSelect: () => pickMaterial(m),
                  }))}
                />
              )}
            </SpecRow>
          )}
          {showSize && selected && (
            <SpecRow label="Size" value={sizeOf(selected)}>
              {ofMaterial.length > 1 && (
                <OptionButtons
                  label="Size"
                  options={ofMaterial.map((v) => ({
                    id: v.key,
                    text: sizeOf(v),
                    selected: v.key === selected.key,
                    available: v.inStock,
                    onSelect: () => setSelectedKey(v.key),
                  }))}
                />
              )}
            </SpecRow>
          )}
        </dl>

        {selected?.inStock && !needsSize && <P1 className="text-graphite">{IN_STOCK_LINE}</P1>}

        {needsSize && (
          <div className="flex flex-col gap-[10px]">
            <P1 className="text-graphite">{MADE_TO_ORDER_LINE}</P1>
            {ring ? (
              <RingSizePicker onChange={setCustomSize} largeSizes={largeSizes} />
            ) : (
              <label className="flex flex-col gap-[6px]">
                <span className="type-p1 text-oslo">Your size</span>
                <input
                  type="text"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  maxLength={CUSTOM_SIZE_MAX}
                  required
                  placeholder="e.g. 45cm"
                  className={`type-p1 min-h-[40px] w-full border bg-transparent px-[10px] placeholder:text-oslo focus:border-redcurrent focus:outline-none ${
                    size ? 'border-redcurrent text-redcurrent' : 'border-graphite text-graphite'
                  }`}
                />
              </label>
            )}
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
            {extras && (
              <MadeToOrderExtras
                offerEngraving={offerEngraving}
                engraving={engraving}
                onEngravingChange={setEngraving}
                notes={notes}
                onNotesChange={setNotes}
              />
            )}
          </div>
        )}
      </div>

      <H3 as="p" className="text-right">
        {selected ? formatGBP(selected.priceGBP + engravingGBP + largeSizeGBP) : '—'}
      </H3>

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
