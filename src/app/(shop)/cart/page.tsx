'use client';

import Link from 'next/link';
import { useCart } from '@/store/cart';

/**
 * Cart — placeholder. Reads the Zustand store (persisted to localStorage).
 * Swap markup for the exported Figma cart/drawer design.
 */
export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalGBP());
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeLine = useCart((s) => s.removeLine);

  if (lines.length === 0) {
    return (
      <main>
        <h1>Cart</h1>
        <p>Your cart is empty.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Cart</h1>
      <ul>
        {lines.map((l) => (
          <li key={`${l.productId}-${l.variantKey}`}>
            {l.title} ({l.sku}) × {l.quantity} — £
            {((l.unitPriceGBP * l.quantity) / 100).toFixed(2)}
            <button onClick={() => updateQuantity(l.productId, l.variantKey, l.quantity + 1)}>
              +
            </button>
            <button onClick={() => updateQuantity(l.productId, l.variantKey, l.quantity - 1)}>
              −
            </button>
            <button onClick={() => removeLine(l.productId, l.variantKey)}>remove</button>
          </li>
        ))}
      </ul>
      <p>Subtotal: £{(subtotal / 100).toFixed(2)}</p>
      <Link href="/checkout">Proceed to checkout</Link>
    </main>
  );
}
