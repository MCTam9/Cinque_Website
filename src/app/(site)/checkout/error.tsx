'use client';

import Link from 'next/link';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

/**
 * Error boundary for the checkout flow (/checkout and /checkout/return). Keeps
 * the site chrome and gives the user a way back instead of Next's bare default
 * error screen. The cart is client-persisted, so it survives.
 */
export default function CheckoutError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-[60px] md:py-[80px]">
      <H1 className="mb-[20px]">Something went wrong</H1>
      <P1 className="mb-[30px] text-graphite">
        We hit a problem with checkout. Your cart is saved — please try again.
      </P1>
      <div className="flex flex-wrap gap-[10px]">
        <button type="button" onClick={reset} className="btn">
          Try again
        </button>
        <Link href="/cart" className="btn">
          Return to cart
        </Link>
      </div>
    </Container>
  );
}
