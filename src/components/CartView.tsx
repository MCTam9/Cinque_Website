'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import { cartLineId, linePriceGBP, useCart } from '@/store/cart';
import { formatGBP } from '@/lib/products';
import {
  EU_PAUSE_NOTICE,
  INTERNATIONAL_DUTIES_NOTE,
  SHIPPING_RATES,
  SHIP_COUNTRIES_SENTENCE,
  formatPence,
  type VisitorOutside,
} from '@/lib/shop/shipping';
import { MADE_TO_ORDER_LINE, priceRows } from '@/lib/shop/madeToOrder';
import Container, { contentPadY } from '@/components/Container';
import { H1, P1, P2 } from '@/components/typography';

/**
 * CART with a rule beneath and the announcement hanging off it, matching the
 * SHOP heading. Same in every state, so nothing shifts once the cart loads.
 */
function CartHeading({
  announcements,
  className = 'mb-[30px]',
}: {
  announcements: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="border-b border-oslo pb-[10px]">
        <H1>CART</H1>
      </div>
      {announcements}
    </div>
  );
}

// Per-line quantity cap — mirrors the checkout API's limit so the cart can't
// exceed what checkout will accept.
const MAX_QTY = 20;

/**
 * `visitor` is set when the visitor seems to be somewhere we don't ship to
 * (from the page, by IP): they're told so before they reach checkout.
 */
export default function CartView({
  visitor,
  announcements,
}: {
  visitor: VisitorOutside | null;
  /** The Admin's announcements for the Cart, rendered on the server. */
  announcements: ReactNode;
}) {
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
      <Container className={contentPadY}>
        <CartHeading announcements={announcements} />
      </Container>
    );
  }

  if (lines.length === 0) {
    return (
      <Container className={contentPadY}>
        <CartHeading announcements={announcements} className="mb-[20px]" />
        <P1 className="mb-[20px] text-oslo">Your cart is empty.</P1>
        <Link href="/shop" className="btn">
          Continue shopping
        </Link>
      </Container>
    );
  }

  return (
    <Container className={contentPadY}>
      <CartHeading
        announcements={announcements}
        className={addedName ? 'mb-[20px]' : 'mb-[30px]'}
      />

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
          {lines.map((l) => {
            const rows = priceRows(l);
            return (
              <li key={cartLineId(l)} className="flex gap-[20px] py-[20px]">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-cloud/30">
                  {l.imageUrl && (
                    <Image
                      src={l.imageUrl}
                      alt={l.title}
                      fill
                      sizes="80px"
                      className="img-bw object-cover"
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <P1>{l.title}</P1>
                  <P2 className="text-oslo">{l.sku}</P2>
                  {l.madeToOrder && <P2 className="text-graphite">{MADE_TO_ORDER_LINE}</P2>}
                  {l.customSize && <P2 className="text-graphite">Size {l.customSize}</P2>}
                  {/* One row per priced item, amounts right-aligned with the line total. */}
                  {rows && (
                    <dl className="type-p2 mt-[6px] flex flex-col gap-0.5 text-graphite">
                      {rows.map((r) => (
                        <div key={r.label} className="flex justify-between gap-[10px]">
                          <dt>{r.label}</dt>
                          <dd className="shrink-0 tabular-nums">{formatGBP(r.amount)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {l.notes && <P2 className="line-clamp-2 text-oslo">Notes: {l.notes}</P2>}

                  <div className="mt-auto flex items-center gap-[10px] pt-[10px]">
                    <div className="flex items-center border border-oslo">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={l.quantity <= 1}
                        onClick={() => updateQuantity(cartLineId(l), Math.max(1, l.quantity - 1))}
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
                          updateQuantity(cartLineId(l), Math.min(MAX_QTY, l.quantity + 1))
                        }
                        className="min-h-[44px] min-w-[44px] type-p1 hover:text-redcurrent disabled:cursor-not-allowed disabled:text-oslo"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(cartLineId(l))}
                      className="type-p2 text-oslo underline underline-offset-4 hover:text-redcurrent"
                    >
                      Remove
                    </button>
                    <P1 className="ml-auto shrink-0 tabular-nums">
                      {formatGBP(linePriceGBP(l) * l.quantity)}
                    </P1>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <aside className="flex h-fit flex-col gap-[20px] border border-oslo p-[20px]">
          <div className="flex justify-between">
            <span className="type-h3">Subtotal</span>
            <span className="type-h3">{formatGBP(subtotal)}</span>
          </div>
          <div className="flex flex-col gap-[10px] border-t border-oslo/40 pt-[20px]">
            <P1 className="text-oslo">Shipping</P1>
            <dl className="type-p1 flex flex-col gap-0.5">
              {[
                ['UK', formatPence(SHIPPING_RATES.domesticPence)],
                ['International', formatPence(SHIPPING_RATES.internationalPence)],
                [`Orders ${formatPence(SHIPPING_RATES.freeFromPence)}+`, 'Free'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-oslo">{label}</dt>
                  <dd className="text-graphite">{value}</dd>
                </div>
              ))}
            </dl>
            <P1 className="text-graphite">
              {subtotal >= SHIPPING_RATES.freeFromPence
                ? 'Your order ships free'
                : `${formatPence(SHIPPING_RATES.freeFromPence - subtotal)} away from free shipping`}
            </P1>
            <P1 className="text-graphite">
              {INTERNATIONAL_DUTIES_NOTE}{' '}
              <Link
                href="/shipping#duties"
                className="underline underline-offset-4 hover:text-redcurrent"
              >
                Details
              </Link>
            </P1>
          </div>
          {visitor && (
            <div className="flex flex-col gap-[6px] border border-graphite p-[10px]">
              <P1 className="font-bold text-graphite">
                We can&rsquo;t ship to {visitor.name} at the moment
              </P1>
              <P1 className="text-graphite">
                {visitor.inEU ? `${EU_PAUSE_NOTICE} ` : ''}We ship to {SHIP_COUNTRIES_SENTENCE}.
              </P1>
            </div>
          )}
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
