import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/types';

interface CartState {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  /** `id` is `cartLineId(line)`. */
  removeLine: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  // Derived selectors
  itemCount: () => number;
  subtotalGBP: () => number;
}

/**
 * A cart line's identity: the variant, plus the size, engraving and notes for
 * made-to-order pieces — so the same ring in sizes N and P, or with two
 * different engravings, stays two separate lines.
 */
export const cartLineId = (
  l: Pick<CartLine, 'productId' | 'variantKey' | 'customSize' | 'engraving' | 'notes'>
) => [l.productId, l.variantKey, l.customSize ?? '', l.engraving ?? '', l.notes ?? ''].join('|');

/** A line's price per piece including any engraving (pence, display-only). */
export const linePriceGBP = (l: Pick<CartLine, 'unitPriceGBP' | 'engravingGBP'>) =>
  l.unitPriceGBP + (l.engravingGBP ?? 0);

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
          const id = cartLineId(line);
          if (state.lines.some((l) => cartLineId(l) === id)) {
            return {
              lines: state.lines.map((l) =>
                cartLineId(l) === id ? { ...l, quantity: l.quantity + line.quantity } : l
              ),
            };
          }
          return { lines: [...state.lines, line] };
        }),

      removeLine: (id) =>
        set((state) => ({
          lines: state.lines.filter((l) => cartLineId(l) !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => cartLineId(l) !== id)
              : state.lines.map((l) => (cartLineId(l) === id ? { ...l, quantity } : l)),
        })),

      clear: () => set({ lines: [] }),

      itemCount: () => get().lines.reduce((n, l) => n + l.quantity, 0),

      subtotalGBP: () =>
        get().lines.reduce((sum, l) => sum + linePriceGBP(l) * l.quantity, 0),
    }),
    {
      name: 'cinque-cart',
      // Only persist the lines; selectors are recomputed.
      partialize: (state) => ({ lines: state.lines }),
    }
  )
);
