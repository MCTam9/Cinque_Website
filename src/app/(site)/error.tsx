'use client';

import Link from 'next/link';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

const btn =
  'type-p1 inline-block border border-graphite px-6 py-3 transition-colors hover:bg-graphite hover:text-cararra';

/**
 * Storefront error boundary. Keeps the Nav/Footer and offers recovery instead
 * of Next's bare default error screen. (Checkout has its own nested boundary.)
 */
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-[60px] md:py-[80px]">
      <H1 className="mb-5">Something went wrong</H1>
      <P1 className="mb-8 text-oslo">
        We hit an unexpected problem. Please try again, or head back to the shop.
      </P1>
      <div className="flex flex-wrap gap-[10px]">
        <button type="button" onClick={reset} className={btn}>
          Try again
        </button>
        <Link href="/shop" className={btn}>
          Shop
        </Link>
      </div>
    </Container>
  );
}
