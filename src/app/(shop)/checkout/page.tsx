'use client';

import { useCart } from '@/store/cart';
import { EmbeddedCheckout } from '@/components/checkout/EmbeddedCheckout';

/**
 * Checkout — mounts Stripe Embedded Checkout with the current cart.
 * The /api/checkout route re-validates prices and stock server-side.
 */
export default function CheckoutPage() {
  const lines = useCart((s) => s.lines);

  const checkoutLines = lines.map((l) => ({
    productId: l.productId,
    variantKey: l.variantKey,
    quantity: l.quantity,
  }));

  if (checkoutLines.length === 0) {
    return (
      <main>
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Checkout</h1>
      <EmbeddedCheckout lines={checkoutLines} />
    </main>
  );
}
