'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { EmbeddedCheckout } from '@/components/checkout/EmbeddedCheckout';
import Container, { contentPadY } from '@/components/Container';
import ImportChargesNotice from '@/components/ImportChargesNotice';
import { H1, P1 } from '@/components/typography';
import {
  SHIP_COUNTRIES,
  countryName,
  formatPence,
  isShipCountry,
  shippingQuote,
  type ShipCountry,
} from '@/lib/shop/shipping';
import {
  REMINDER_OPT_OUT_LABEL,
  looksLikeEmail,
  readPrefill,
  writePrefill,
} from '@/lib/shop/checkoutEmail';

export function CheckoutView({ defaultCountry }: { defaultCountry: ShipCountry }) {
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalGBP());
  const [country, setCountry] = useState<ShipCountry>(defaultCountry);
  const [editing, setEditing] = useState(false);
  // The email step: typed here, then handed to Stripe's form filled in.
  const [email, setEmail] = useState('');
  const [noReminder, setNoReminder] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [recoveredFrom, setRecoveredFrom] = useState<string | null>(null);
  const emailId = useId();

  // Arriving from a reminder link (or a reload): fill in what we know.
  useEffect(() => {
    const prefill = readPrefill();
    if (prefill.email) {
      setEmail(prefill.email);
      setConfirmedEmail(prefill.email);
    }
    if (isShipCountry(prefill.country)) setCountry(prefill.country);
    if (prefill.recoveredFrom) setRecoveredFrom(prefill.recoveredFrom);
  }, []);

  const continueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!looksLikeEmail(value)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setConfirmedEmail(value);
    writePrefill({ email: value });
  };

  const checkoutLines = lines.map((l) => ({
    productId: l.productId,
    variantKey: l.variantKey,
    quantity: l.quantity,
    ...(l.customSize ? { customSize: l.customSize } : {}),
    ...(l.engraving ? { engraving: l.engraving } : {}),
    ...(l.notes ? { notes: l.notes } : {}),
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
            Shipping to <span className="text-graphite">{countryName(country)}</span> /{' '}
            <span className="text-graphite">
              {quote.amountPence === 0 ? 'free' : formatPence(quote.amountPence)}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-[10px] underline underline-offset-4 hover:text-redcurrent"
            >
              Change
            </button>
          </P1>
        )}
        <ImportChargesNotice country={country} />
      </div>

      {confirmedEmail ? (
        <>
          <P1 className="mb-[20px] text-oslo">
            Email <span className="text-graphite">{confirmedEmail}</span>
            <button
              type="button"
              onClick={() => setConfirmedEmail(null)}
              className="ml-[10px] underline underline-offset-4 hover:text-redcurrent"
            >
              Change
            </button>
          </P1>
          <EmbeddedCheckout
            lines={checkoutLines}
            country={country}
            email={confirmedEmail}
            remind={!noReminder}
            recoveredFrom={recoveredFrom}
          />
        </>
      ) : (
        <form
          onSubmit={continueToPayment}
          noValidate
          className="flex max-w-[480px] flex-col gap-[10px]"
        >
          <label htmlFor={emailId} className="type-p1 text-oslo">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(false);
            }}
            aria-invalid={emailError}
            aria-describedby={emailError ? `${emailId}-error` : undefined}
            placeholder="you@example.com"
            className={`type-p1 min-h-[44px] w-full border bg-transparent px-[10px] text-graphite placeholder:text-oslo focus:outline-none ${
              emailError ? 'border-redcurrent' : 'border-graphite focus:border-redcurrent'
            }`}
          />
          {emailError && (
            <P1 id={`${emailId}-error`} className="text-redcurrent">
              Please enter a valid email address.
            </P1>
          )}
          {/* The opt-out the reminder relies on: offered where the address is taken. */}
          <label className="type-p1 flex cursor-pointer items-start gap-[10px] text-oslo">
            <input
              type="checkbox"
              checked={noReminder}
              onChange={(e) => setNoReminder(e.target.checked)}
              className="mt-[3px] h-[16px] w-[16px] shrink-0 accent-graphite"
            />
            <span>{REMINDER_OPT_OUT_LABEL}</span>
          </label>
          <button
            type="submit"
            className="type-h3 mt-[10px] min-h-[48px] bg-graphite text-cararra transition-colors hover:bg-redcurrent"
          >
            Continue to payment
          </button>
        </form>
      )}
    </Container>
  );
}
