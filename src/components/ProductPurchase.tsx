'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import { CUSTOM_SIZE_MAX, MADE_TO_ORDER_LEAD_TIME } from '@/lib/shop/madeToOrder';
import { H3, P1 } from '@/components/typography';
import { RING_SIZE_CHART_ID } from '@/components/RingSizeChart';

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
 * A made-to-order option (swatch "Custom") adds the lead time and a required
 * "Your size" field between the two; Add to cart waits until it is filled.
 */
export default function ProductPurchase({
  productId,
  title,
  variants,
  imageUrl,
  showRingSizeChartLink = false,
}: {
  productId: string;
  title: string;
  variants: PurchaseVariant[];
  imageUrl?: string;
  /** Rings only: link the size field to the ring size chart below. */
  showRingSizeChartLink?: boolean;
}) {
  const addLine = useCart((s) => s.addLine);
  const router = useRouter();
  const firstAvailable = variants.find((v) => v.inStock) ?? variants[0];
  const [selectedKey, setSelectedKey] = useState(firstAvailable?.key);
  const [customSize, setCustomSize] = useState('');

  const selected = variants.find((v) => v.key === selectedKey) ?? firstAvailable;
  const size = customSize.trim();
  const needsSize = Boolean(selected?.madeToOrder);
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
        <H3 as="p">{selected ? formatGBP(selected.priceGBP) : '—'}</H3>
      </div>

      {needsSize && (
        <div className="flex flex-col gap-[10px]">
          <P1 className="text-graphite">
            Made to order · ships in {MADE_TO_ORDER_LEAD_TIME}
          </P1>
          <label className="flex flex-col gap-[6px]">
            <span className="type-p1 text-oslo">Your size</span>
            <input
              type="text"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              maxLength={CUSTOM_SIZE_MAX}
              required
              placeholder={showRingSizeChartLink ? 'UK size, e.g. N½' : 'e.g. 45cm'}
              className="type-p1 min-h-[40px] w-full border border-graphite bg-transparent px-[10px] text-graphite placeholder:text-oslo focus:border-redcurrent focus:outline-none"
            />
          </label>
          {showRingSizeChartLink && (
            <a
              href={`#${RING_SIZE_CHART_ID}`}
              className="type-p1 w-fit text-oslo underline underline-offset-4 hover:text-redcurrent"
            >
              Ring size chart
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        className="type-h3 min-h-[40px] w-full border border-graphite text-graphite transition-colors hover:bg-graphite hover:text-cararra disabled:border-oslo disabled:text-oslo"
      >
        {!selected?.inStock ? 'Sold out' : needsSize && !size ? 'Enter your size' : 'Add to cart'}
      </button>
    </div>
  );
}
