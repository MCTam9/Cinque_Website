import type { Metadata } from 'next';

/** Covers /checkout and /checkout/return — see the note in cart/layout.tsx. */
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
