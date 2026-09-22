'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { EmbeddedCheckout } from '@/components/checkout/EmbeddedCheckout';
import Container, { contentPadY } from '@/components/Container';
import { H1, P1 } from '@/components/typography';
import {
  HOME_COUNTRY,
  SHIP_COUNTRIES,
  countryName,
  formatPence,
  isShipCountry,
  shippingQuote,
  type ShipCountry,
} from '@/lib/shop/shipping';

export function CheckoutView({ defaultCountry }: { defaultCountry: ShipCountry }) {
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalGBP());
  const [country, setCountry] = useState<ShipCountry>(defaultCountry);
  const [editing, setEditing] = useState(false);

  const checkoutLines = lines.map((l) => ({
    productId: l.productId,
    variantKey: l.variantKey,
    quantity: l.quantity,
  }));

  if (checkoutLines.length === 0) {
    return (
      <Container className={contentPadY}>
        <H1 className="mb-[20px]">CHECKOUT</H1>
        <P1 className="mb-[20px] text-oslo">Your cart is empty.</P1>
        <Link href="/shop" className="btn">
          Continue shopping
        </Link>
      </Container>
    );
  }

  // Display only: the checkout API recomputes this from trusted prices.
  const quote = shippingQuote(country, subtotal);

  return (
    <Container className={contentPadY}>
      <H1 className="mb-[30px]">CHECKOUT</H1>

      <div className="mb-[20px] flex flex-col gap-[10px]">
        {editing ? (
          <label className="type-p1 flex flex-wrap items-center gap-[10px]">
            <span className="text-oslo">Shipping to</span>
            <select
              value={country}
              autoFocus
              onChange={(e) => {
                if (isShipCountry(e.target.value)) setCountry(e.target.value);
                setEditing(false);
              }}
              onBlur={() => setEditing(false)}
              className="type-p1 border border-oslo bg-transparent px-[10px] py-[6px] text-graphite"
            >
              {SHIP_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <P1 className="text-oslo">
            Shipping to <span className="text-graphite">{countryName(country)}</span> ·{' '}
            <span className="text-graphite">
              {quote.amountPence === 0 ? 'Free' : formatPence(quote.amountPence)}
            </span>{' '}
            ·{' '}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="underline underline-offset-4 hover:text-redcurrent"
            >
              Change
            </button>
          </P1>
        )}
        {country !== HOME_COUNTRY && (
          <P1 className="text-oslo">
            Import duties and taxes may be charged on delivery and are the recipient&rsquo;s
            responsibility.
          </P1>
        )}
      </div>

      <EmbeddedCheckout lines={checkoutLines} country={country} />
    </Container>
  );
}
