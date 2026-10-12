'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { publicEnv } from '@/lib/env';
import { P1 } from '@/components/typography';
import type { CheckoutRequestLine } from '@/types';
import type { ShipCountry } from '@/lib/shop/shipping';

// Publishable key is safe on the client. Loaded once, module-level.
const stripePromise = loadStripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/**
 * Stripe Embedded Checkout. Renders Stripe's hosted checkout inside an iframe
 * (zero-touch PCI). We fetch the clientSecret from our /api/checkout route
 * ourselves so that a validation failure (out of stock, cart too large) shows a
 * clear message with a route back to the cart, instead of Stripe's generic
 * error. Keyed on the cart contents, destination country and email, so it
 * only re-requests when one changes — a new country means a new session, since
 * each session only accepts an address in its own country.
 */
export function EmbeddedCheckout({
  lines,
  country,
  email,
  remind,
  recoveredFrom,
  onSession,
}: {
  lines: CheckoutRequestLine[];
  country: ShipCountry;
  /** From the email step; Stripe shows it filled in. */
  email: string;
  /**
   * False when the buyer ticked the opt-out. Read when a session is created;
   * a later change is saved onto the open session instead (see onSession).
   */
  remind: boolean;
  recoveredFrom?: string | null;
  /** The open Checkout Session's id, for saving the opt-out onto it. */
  onSession?: (sessionId: string | null) => void;
}) {
  const remindRef = useRef(remind);
  remindRef.current = remind;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const linesKey = JSON.stringify(lines);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setClientSecret(null);
    (async () => {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines,
            country,
            email,
            remind: remindRef.current,
            ...(recoveredFrom ? { recoveredFrom } : {}),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Checkout failed.' }));
          throw new Error(body.error ?? 'Checkout failed.');
        }
        const { clientSecret: secret } = await res.json();
        if (!cancelled) {
          setClientSecret(secret as string);
          onSession?.((secret as string).split('_secret_')[0]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Checkout failed.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // linesKey captures the cart contents; re-run only when they, the country
    // or the email step change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, country, email]);

  if (error) {
    return (
      <div className="border border-graphite p-6">
        <P1 className="mb-[10px] font-bold">We couldn&rsquo;t start checkout</P1>
        <P1 className="mb-[20px] text-graphite">{error}</P1>
        <Link href="/cart" className="btn">
          Return to cart
        </Link>
      </div>
    );
  }

  if (!clientSecret) {
    return <P1 className="text-oslo">Loading checkout…</P1>;
  }

  return (
    <div id="checkout">
      {/* Keyed on the secret: Stripe's provider can't swap sessions in place. */}
      <EmbeddedCheckoutProvider
        key={clientSecret}
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
