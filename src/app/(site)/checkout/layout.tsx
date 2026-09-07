import type { Metadata } from 'next';

/** Covers /checkout and /checkout/return — see the note in cart/layout.tsx. */
// The strict, nonce-based CSP in src/middleware.ts applies to this route.
// A nonce is minted per request, so the HTML cannot be prerendered or shared
// from the cache — it has to render on demand. That costs nothing in search
// terms: this route is noindexed anyway.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
