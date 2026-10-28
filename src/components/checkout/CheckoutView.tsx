'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { EmbeddedCheckout } from '@/components/checkout/EmbeddedCheckout';
import Container, { contentPadY } from '@/components/Container';
import ImportChargesNotice from '@/components/ImportChargesNotice';
import { H1, P1 } from '@/components/typography';
import {
  addressIn,
  EU_PAUSE_NOTICE,
  SHIP_COUNTRIES,
  SHIPPING_REACH,
  countryName,
  formatPence,
  isShipCountry,
  shippingQuote,
  type ShipCountry,
  type VisitorOutside,
} from '@/lib/shop/shipping';
import {
  REMINDER_OPT_OUT_LABEL,
  looksLikeEmail,
  readPrefill,
  writePrefill,
} from '@/lib/shop/checkoutEmail';

/**
 * `defaultCountry` is null for a visitor somewhere we don't ship to (`visitor`,
 * by IP): they pick a country themselves, with the list of where we do ship,
 * then confirm the order is going to an address there before Stripe's form
 * opens. Stripe's form takes any address under the country it shows, so this
 * is the check before payment; the webhook flags a mismatch after it.
 */
export function CheckoutView({
  defaultCountry,
  visitor,
  announcements,
}: {
  defaultCountry: ShipCountry | null;
  visitor: VisitorOutside | null;
  /** The Admin's announcements for Checkout, rendered on the server. */
  announcements: ReactNode;
}) {
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalGBP());
  const [country, setCountry] = useState<ShipCountry | null>(defaultCountry);
  const [countryError, setCountryError] = useState(false);
  // The country the visitor confirmed their address is in (outside visitors).
  const [confirmedFor, setConfirmedFor] = useState<ShipCountry | null>(null);
  const [confirmError, setConfirmError] = useState(false);
  const addressConfirmed = !visitor || (country !== null && confirmedFor === country);
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
    if (!addressConfirmed) {
      setConfirmError(true);
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
        <div className="mb-[20px]">
          <div className="border-b border-oslo pb-[10px]">
            <H1>CHECKOUT</H1>
          </div>
          {announcements}
        </div>
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
      <div className="mb-[30px]">
        <div className="border-b border-oslo pb-[10px]">
          <H1>CHECKOUT</H1>
        </div>
        {announcements}
      </div>

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
              {/* UK and US first, then everywhere else A–Z. */}
              {SHIP_COUNTRIES.slice(0, 2).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
              <option disabled>──────────</option>
              {SHIP_COUNTRIES.slice(2).map((c) => (
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
        {country && visitor && (
          <div
            className={`flex flex-col gap-[6px] border p-[10px] ${
              confirmError && !addressConfirmed ? 'border-redcurrent' : 'border-graphite'
            }`}
          >
            <P1 className="font-bold text-graphite">You seem to be in {visitor.name}</P1>
            <P1 className="text-graphite">Is this order going to {addressIn(country)}?</P1>
            <label className="type-p1 flex cursor-pointer items-start gap-[10px] text-graphite">
              <input
                type="checkbox"
                checked={addressConfirmed}
                onChange={(e) => {
                  setConfirmedFor(e.target.checked ? country : null);
                  setConfirmError(false);
                }}
                className="mt-[3px] h-[16px] w-[16px] shrink-0 accent-graphite"
              />
              <span>Yes, it&rsquo;s going to {addressIn(country)}</span>
            </label>
            {confirmError && !addressConfirmed && (
              <P1 className="text-redcurrent">
                Please confirm the address, or change the country above.
              </P1>
            )}
            {visitor.paused && <P1 className="text-oslo">{EU_PAUSE_NOTICE}</P1>}
          </div>
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
              {SHIPPING_REACH} {EU_PAUSE_NOTICE}
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
          {country && addressConfirmed && (
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
