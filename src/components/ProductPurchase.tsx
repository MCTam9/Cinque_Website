'use client';

import { useState } from 'react';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import { P1, P2 } from '@/components/typography';

export interface PurchaseVariant {
  key: string;
  sku: string;
  label: string; // e.g. "Sterling_Silver · M"
  priceGBP: number; // pence
  inStock: boolean;
}

/**
 * PDP purchase panel: variant selector + add-to-cart. Client-side so it can
 * mutate the Zustand cart; price shown is a display snapshot (checkout
 * re-validates server-side).
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
    <div className="flex flex-col gap-5">
      <P1 className="text-xl">{selected ? formatGBP(selected.priceGBP) : '—'}</P1>

      {variants.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="type-p2 mb-1 text-oslo">Option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSel = v.key === selected?.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setSelectedKey(v.key)}
                  disabled={!v.inStock}
                  className={`type-p2 min-h-[44px] border px-3 py-2 transition-colors ${
                    isSel
                      ? 'border-redcurrent text-redcurrent'
                      : 'border-oslo text-graphite hover:border-graphite'
                  } disabled:cursor-not-allowed disabled:text-oslo disabled:line-through`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        className="type-p1 min-h-[48px] w-full bg-graphite px-6 text-cararra transition-colors hover:bg-redcurrent disabled:bg-oslo"
      >
        {!canAdd ? 'Sold out' : added ? 'Added to cart ✓' : 'Add to cart'}
      </button>

      {added && <P2 className="text-oslo">Added — view your cart to check out.</P2>}
    </div>
  );
}
