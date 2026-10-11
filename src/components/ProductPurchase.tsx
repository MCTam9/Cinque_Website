'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import {
  CUSTOM_SIZE_MAX,
  ENGRAVING_PRICE_PENCE,
  MADE_TO_ORDER_LEAD_TIME,
} from '@/lib/shop/madeToOrder';
import { H3, P1 } from '@/components/typography';
import { RING_SIZE_CHART_ID } from '@/components/RingSizeChart';
import RingSizePicker from '@/components/RingSizePicker';
import MadeToOrderExtras from '@/components/MadeToOrderExtras';

export interface PurchaseVariant {
  key: string;
  sku: string;
  swatch: string; // short label shown in the square, e.g. size "M" or metal
  label: string; // full label for a11y / tooltip
  priceGBP: number;
  inStock: boolean;
  /** Made to order: the customer types their own size; never stock-limited. */
  madeToOrder: boolean;
}

/**
 * PDP purchase panel (Figma): a row of square option buttons on the left and
 * the price on the right, then a full-width bordered Add-to-cart button.
 *
 * A made-to-order option (swatch "Made to Order") adds the lead time and a required
 * size between the two: a UK/US/EU/JP wheel for rings, free text otherwise.
 * Made-to-order rings also take notes, and a paid engraving where the Admin
 * offers one. Add to cart waits
 * until a size is given.
 */
export default function ProductPurchase({
  productId,
  title,
  variants,
  imageUrl,
  ring = false,
  engraving: offerEngraving = false,
}: {
  productId: string;
  title: string;
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
  const size = customSize.trim();
  const needsSize = Boolean(selected?.madeToOrder);
  // Notes exist on any made-to-order ring; engraving only where the Admin offers it.
  const extras = needsSize && ring;
  const engravingText = extras && offerEngraving ? engraving.trim() : '';
  const notesText = extras ? notes.trim() : '';
  const engravingGBP = engravingText ? ENGRAVING_PRICE_PENCE : 0;
  const canAdd = Boolean(selected?.inStock) && (!needsSize || size.length > 0);

  const handleAdd = () => {
    if (!selected || !canAdd) return;
    addLine({
      productId,
      variantKey: selected.key,
      sku: selected.sku,
      title,
      unitPriceGBP: selected.priceGBP,
      quantity: 1,
      imageUrl,
      ...(needsSize ? { madeToOrder: true, customSize: size } : {}),
      ...(engravingText ? { engraving: engravingText, engravingGBP } : {}),
      ...(notesText ? { notes: notesText } : {}),
    });
    // Jump to the cart, which shows the "added" confirmation.
    router.push(`/cart?added=${encodeURIComponent(title)}`);
  };

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex items-end justify-between">
        <div className="flex flex-wrap gap-[10px]">
          {variants.map((v) => {
            const isSel = v.key === selected?.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setSelectedKey(v.key)}
                disabled={!v.inStock}
                title={v.label}
                aria-label={v.label}
                aria-pressed={isSel}
                className={`type-p1 flex h-[50px] min-w-[50px] items-center justify-center border px-[8px] transition-colors ${
                  isSel
                    ? 'border-redcurrent text-redcurrent'
                    : 'border-graphite text-graphite hover:border-redcurrent'
                } disabled:cursor-not-allowed disabled:border-oslo disabled:text-oslo disabled:line-through`}
              >
                {v.swatch}
              </button>
            );
          })}
        </div>
        <H3 as="p">{selected ? formatGBP(selected.priceGBP + engravingGBP) : '—'}</H3>
      </div>

      {needsSize && (
        <div className="flex flex-col gap-[10px]">
          <P1 className="text-graphite">
            Made to order · ships in {MADE_TO_ORDER_LEAD_TIME}
          </P1>
          {ring ? (
            <RingSizePicker onChange={setCustomSize} />
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
