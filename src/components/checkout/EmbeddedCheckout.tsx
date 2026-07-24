'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { publicEnv } from '@/lib/env';
import { P1 } from '@/components/typography';
import type { CheckoutRequestLine } from '@/types';

// Publishable key is safe on the client. Loaded once, module-level.
const stripePromise = loadStripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/**
 * Stripe Embedded Checkout. Renders Stripe's hosted checkout inside an iframe
 * (zero-touch PCI). We fetch the clientSecret from our /api/checkout route
 * ourselves so that a validation failure (out of stock, cart too large) shows a
 * clear message with a route back to the cart, instead of Stripe's generic
 * error. Keyed on the cart contents so it only re-requests when they change.
 */
export function EmbeddedCheckout({ lines }: { lines: CheckoutRequestLine[] }) {
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
          body: JSON.stringify({ lines }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Checkout failed.' }));
          throw new Error(body.error ?? 'Checkout failed.');
        }
        const { clientSecret: secret } = await res.json();
        if (!cancelled) setClientSecret(secret as string);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Checkout failed.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // linesKey captures the cart contents; re-run only when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  if (error) {
    return (
      <div className="border border-graphite p-6">
        <P1 className="mb-2 font-bold">We couldn&rsquo;t start checkout</P1>
        <P1 className="mb-5 text-graphite">{error}</P1>
        <Link
          href="/cart"
          className="type-p1 inline-block border border-graphite px-6 py-3 transition-colors hover:bg-graphite hover:text-cararra"
        >
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
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
