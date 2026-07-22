'use client';

import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { publicEnv } from '@/lib/env';
import type { CheckoutRequestLine } from '@/types';

// Publishable key is safe on the client. Loaded once, module-level.
const stripePromise = loadStripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/**
 * Stripe Embedded Checkout. Renders Stripe's hosted checkout inside an iframe
 * (zero-touch PCI). The clientSecret is fetched from our /api/checkout route,
 * which validates prices/stock server-side.
 */
export function EmbeddedCheckout({ lines }: { lines: CheckoutRequestLine[] }) {
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Checkout failed.' }));
      throw new Error(error ?? 'Checkout failed.');
    }
    const { clientSecret } = await res.json();
    return clientSecret as string;
  }, [lines]);

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
