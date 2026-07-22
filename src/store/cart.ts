import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/types';

interface CartState {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  removeLine: (productId: string, variantKey: string) => void;
  updateQuantity: (productId: string, variantKey: string, quantity: number) => void;
  clear: () => void;
  // Derived selectors
  itemCount: () => number;
  subtotalGBP: () => number;
}

const sameLine = (a: CartLine, productId: string, variantKey: string) =>
  a.productId === productId && a.variantKey === variantKey;

/**
 * Client-side cart. Persisted to localStorage so the basket survives reloads.
 * Prices here are DISPLAY-ONLY snapshots — the checkout route re-fetches and
 * re-validates every price and stock level server-side before charging.
 */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      addLine: (line) =>
        set((state) => {
          const existing = state.lines.find((l) =>
            sameLine(l, line.productId, line.variantKey)
          );
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                sameLine(l, line.productId, line.variantKey)
                  ? { ...l, quantity: l.quantity + line.quantity }
                  : l
              ),
            };
          }
          return { lines: [...state.lines, line] };
        }),

      removeLine: (productId, variantKey) =>
        set((state) => ({
          lines: state.lines.filter((l) => !sameLine(l, productId, variantKey)),
        })),

      updateQuantity: (productId, variantKey, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => !sameLine(l, productId, variantKey))
              : state.lines.map((l) =>
                  sameLine(l, productId, variantKey) ? { ...l, quantity } : l
                ),
        })),

      clear: () => set({ lines: [] }),

      itemCount: () => get().lines.reduce((n, l) => n + l.quantity, 0),

      subtotalGBP: () =>
        get().lines.reduce((sum, l) => sum + l.unitPriceGBP * l.quantity, 0),
    }),
    {
      name: 'cinque-cart',
      // Only persist the lines; selectors are recomputed.
      partialize: (state) => ({ lines: state.lines }),
    }
  )
);
