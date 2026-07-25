'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import Container from '@/components/Container';
import { H1, P1, P2 } from '@/components/typography';

// Per-line quantity cap — mirrors the checkout API's limit so the cart can't
// exceed what checkout will accept.
const MAX_QTY = 20;

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalGBP());
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeLine = useCart((s) => s.removeLine);

  // Avoid hydration mismatch (cart is persisted client-side).
  const [mounted, setMounted] = useState(false);
  const [addedName, setAddedName] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
    // Read the "just added" item name from the URL (set by the PDP add-to-cart).
    const added = new URLSearchParams(window.location.search).get('added');
    if (added) setAddedName(added);
  }, []);

  if (!mounted) {
    return (
      <Container className="py-[40px] md:py-[60px]">
        <H1>CART</H1>
      </Container>
    );
  }

  if (lines.length === 0) {
    return (
      <Container className="py-[40px] md:py-[60px]">
        <H1 className="mb-[20px]">CART</H1>
        <P1 className="mb-[20px] text-oslo">Your cart is empty.</P1>
        <Link href="/shop" className="btn">
          Continue shopping
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-[40px] md:py-[60px]">
      <H1 className={addedName ? 'mb-[10px]' : 'mb-[30px]'}>CART</H1>

      {addedName && (
        <div className="mb-[30px] flex flex-col gap-[10px]">
          <P1>{addedName} has been added to your cart</P1>
          <Link
            href="/shop"
            className="type-p1 w-fit underline underline-offset-4 hover:text-redcurrent"
          >
            Continue shopping
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-[30px] md:grid-cols-[1fr_320px] md:gap-[40px]">
        {/* Line items */}
        <ul className="flex flex-col divide-y divide-oslo/40 border-y border-oslo/40">
          {lines.map((l) => (
            <li key={`${l.productId}-${l.variantKey}`} className="flex gap-[20px] py-[20px]">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-cloud/30">
                {l.imageUrl && (
                  <Image
                    src={l.imageUrl}
                    alt={l.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <P1>{l.title}</P1>
                <P2 className="text-oslo">{l.sku}</P2>

                <div className="mt-auto flex items-center gap-[10px]">
                  <div className="flex items-center border border-oslo">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={l.quantity <= 1}
                      onClick={() =>
                        updateQuantity(l.productId, l.variantKey, Math.max(1, l.quantity - 1))
                      }
                      className="min-h-[44px] min-w-[44px] type-p1 hover:text-redcurrent disabled:cursor-not-allowed disabled:text-oslo"
                    >
                      −
                    </button>
                    <span className="type-p2 min-w-[28px] text-center">{l.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={l.quantity >= MAX_QTY}
                      onClick={() =>
                        updateQuantity(l.productId, l.variantKey, Math.min(MAX_QTY, l.quantity + 1))
                      }
                      className="min-h-[44px] min-w-[44px] type-p1 hover:text-redcurrent disabled:cursor-not-allowed disabled:text-oslo"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(l.productId, l.variantKey)}
                    className="type-p2 text-oslo underline underline-offset-4 hover:text-redcurrent"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <P1 className="shrink-0">{formatGBP(l.unitPriceGBP * l.quantity)}</P1>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside className="flex h-fit flex-col gap-[20px] border border-oslo p-[20px]">
          <div className="flex justify-between">
            <span className="type-h3">Subtotal</span>
            <span className="type-h3">{formatGBP(subtotal)}</span>
          </div>
          <P1 className="text-oslo">Shipping calculated at checkout.</P1>
          <Link
            href="/checkout"
            className="type-h3 min-h-[48px] flex items-center justify-center bg-graphite text-cararra transition-colors hover:bg-redcurrent"
          >
            Proceed to checkout
          </Link>
          <Link href="/shop" className="type-p1 text-center text-oslo hover:text-graphite">
            Continue shopping
          </Link>
        </aside>
      </div>
    </Container>
  );
}
