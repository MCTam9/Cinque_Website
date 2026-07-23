'use client';

import { useState } from 'react';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import { P1, P2 } from '@/components/typography';

export interface PurchaseVariant {
  key: string;
  sku: string;
  swatch: string; // short label shown in the square, e.g. size "M" or metal
  label: string; // full label for a11y / tooltip
  priceGBP: number;
  inStock: boolean;
}

/**
 * PDP purchase panel (Figma): a row of square option buttons on the left and
 * the price on the right, then a full-width bordered Add-to-cart button.
 */
export default function ProductPurchase({
  productId,
  title,
  variants,
  imageUrl,
}: {
  productId: string;
  title: string;
  variants: PurchaseVariant[];
  imageUrl?: string;
}) {
  const addLine = useCart((s) => s.addLine);
  const firstAvailable = variants.find((v) => v.inStock) ?? variants[0];
  const [selectedKey, setSelectedKey] = useState(firstAvailable?.key);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.key === selectedKey) ?? firstAvailable;
  const canAdd = Boolean(selected?.inStock);

  const handleAdd = () => {
    if (!selected || !selected.inStock) return;
    addLine({
      productId,
      variantKey: selected.key,
      sku: selected.sku,
      title,
      unitPriceGBP: selected.priceGBP,
      quantity: 1,
      imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
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
                className={`type-p1 flex h-[50px] w-[50px] items-center justify-center border transition-colors ${
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
        <P1 className="text-lg">{selected ? formatGBP(selected.priceGBP) : '—'}</P1>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        className="type-h3 min-h-[40px] w-full border border-graphite text-graphite transition-colors hover:bg-graphite hover:text-cararra disabled:border-oslo disabled:text-oslo"
      >
        {!canAdd ? 'Sold out' : added ? 'Added to cart ✓' : 'Add to cart'}
      </button>

      {added && <P2 className="text-oslo">Added — view your cart to check out.</P2>}
    </div>
  );
}
