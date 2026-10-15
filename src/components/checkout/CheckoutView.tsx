'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { EmbeddedCheckout } from '@/components/checkout/EmbeddedCheckout';
import Container, { contentPadY } from '@/components/Container';
import ImportChargesNotice from '@/components/ImportChargesNotice';
import { H1, P1 } from '@/components/typography';
import {
  EU_PAUSE_NOTICE,
  SHIP_COUNTRIES,
  SHIP_COUNTRIES_SENTENCE,
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

/**
 * `defaultCountry` is null for a visitor somewhere we don't ship to: they pick
 * a country themselves before paying, with the list of where we do ship.
 */
export function CheckoutView({ defaultCountry }: { defaultCountry: ShipCountry | null }) {
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalGBP());
  const [country, setCountry] = useState<ShipCountry | null>(defaultCountry);
  const [countryError, setCountryError] = useState(false);
  const [editing, setEditing] = useState(false);
  // The email step: typed here, then handed to Stripe's form filled in.
  const [email, setEmail] = useState('');
  const [noReminder, setNoReminder] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [recoveredFrom, setRecoveredFrom] = useState<string | null>(null);
  // The open Stripe session, so the opt-out can be saved onto it in place.
  const [sessionId, setSessionId] = useState<string | null>(null);
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
    if (!country) {
      setCountryError(true);
      return;
    }
    setConfirmedEmail(value);
    writePrefill({ email: value });
  };

  const toggleReminder = (optOut: boolean) => {
    setNoReminder(optOut);
    if (sessionId) {
      void fetch('/api/checkout/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, remind: !optOut }),
      }).catch(() => {});
    }
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
  const quote = country ? shippingQuote(country, subtotal) : null;

  return (
    <Container className={contentPadY}>
      <H1 className="mb-[30px]">CHECKOUT</H1>

      <div className="mb-[20px] flex flex-col gap-[10px]">
        {editing || !country || !quote ? (
          <label className="type-p1 flex flex-wrap items-center gap-[10px]">
            <span className="text-oslo">Shipping to</span>
            <select
              value={country ?? ''}
              autoFocus={editing}
              onChange={(e) => {
                if (isShipCountry(e.target.value)) {
                  setCountry(e.target.value);
                  setCountryError(false);
                }
                setEditing(false);
              }}
              onBlur={() => setEditing(false)}
              aria-invalid={countryError}
              className={`type-p1 border bg-transparent px-[10px] py-[6px] text-graphite ${
                countryError ? 'border-redcurrent' : 'border-oslo'
              }`}
            >
              {!country && (
                <option value="" disabled>
                  Choose a country
                </option>
              )}
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
        {country ? (
          <ImportChargesNotice country={country} />
        ) : (
          <>
            {countryError && (
              <P1 className="text-redcurrent">
                Please choose the country we&rsquo;re shipping to.
              </P1>
            )}
            <P1 className="text-oslo">
              We ship to {SHIP_COUNTRIES_SENTENCE}. {EU_PAUSE_NOTICE}
            </P1>
          </>
        )}
      </div>

      {confirmedEmail ? (
        <>
          <P1 className="mb-[10px] text-oslo">
            Email <span className="text-graphite">{confirmedEmail}</span>
            <button
              type="button"
              onClick={() => setConfirmedEmail(null)}
              className="ml-[10px] underline underline-offset-4 hover:text-redcurrent"
            >
              Change
            </button>
          </P1>
          {/* The opt-out the reminder relies on, offered with the address. */}
          <label className="type-p1 mb-[20px] flex cursor-pointer items-start gap-[10px] text-oslo">
            <input
              type="checkbox"
              checked={noReminder}
              onChange={(e) => toggleReminder(e.target.checked)}
              className="mt-[3px] h-[16px] w-[16px] shrink-0 accent-graphite"
            />
            <span>{REMINDER_OPT_OUT_LABEL}</span>
          </label>
          {country && (
            <EmbeddedCheckout
              lines={checkoutLines}
              country={country}
              email={confirmedEmail}
              remind={!noReminder}
              recoveredFrom={recoveredFrom}
              onSession={setSessionId}
            />
          )}
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
