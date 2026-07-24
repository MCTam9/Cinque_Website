'use client';

import Link from 'next/link';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

const btn =
  'type-p1 inline-block border border-graphite px-6 py-3 transition-colors hover:bg-graphite hover:text-cararra';

/**
 * Error boundary for the checkout flow (/checkout and /checkout/return). Keeps
 * the site chrome and gives the user a way back instead of Next's bare default
 * error screen. The cart is client-persisted, so it survives.
 */
export default function CheckoutError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-[60px] md:py-[80px]">
      <H1 className="mb-5">Something went wrong</H1>
      <P1 className="mb-8 text-graphite">
        We hit a problem with checkout. Your cart is saved — please try again.
      </P1>
      <div className="flex flex-wrap gap-[10px]">
        <button type="button" onClick={reset} className={btn}>
          Try again
        </button>
        <Link href="/cart" className={btn}>
          Return to cart
        </Link>
      </div>
    </Container>
  );
}
