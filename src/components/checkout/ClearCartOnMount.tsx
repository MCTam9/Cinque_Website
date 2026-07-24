'use client';

import { useEffect } from 'react';
import { useCart } from '@/store/cart';

/**
 * Empties the cart once, on mount. Rendered only on the *confirmed* order
 * screen, so a successful purchase clears the basket (and resets the Nav count)
 * instead of leaving stale items that could be re-purchased. Uses getState() so
 * it doesn't subscribe/re-render.
 */
export default function ClearCartOnMount() {
  useEffect(() => {
    useCart.getState().clear();
  }, []);
  return null;
}
