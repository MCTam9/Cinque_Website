import type { Metadata } from 'next';

/**
 * The cart page itself is a client component and cannot export metadata, so the
 * noindex lives here. robots.ts already disallows /cart, but Disallow only
 * stops crawling — a URL linked from elsewhere can still be indexed without
 * being fetched. This tag is what actually keeps it out.
 */
export const metadata: Metadata = {
  title: 'Cart',
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
