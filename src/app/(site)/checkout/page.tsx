'use client';

import Link from 'next/link';
import { useCart } from '@/store/cart';
import { EmbeddedCheckout } from '@/components/checkout/EmbeddedCheckout';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

/**
 * Checkout — mounts Stripe Embedded Checkout with the current cart.
 * The /api/checkout route re-validates prices and stock server-side.
 */
export default function CheckoutPage() {
  const lines = useCart((s) => s.lines);

  const checkoutLines = lines.map((l) => ({
    productId: l.productId,
    variantKey: l.variantKey,
    quantity: l.quantity,
  }));

  if (checkoutLines.length === 0) {
    return (
      <Container className="py-12 md:py-16">
        <H1 className="mb-4">CHECKOUT</H1>
        <P1 className="mb-6 text-oslo">Your cart is empty.</P1>
        <Link
          href="/shop"
          className="type-p1 inline-block border border-graphite px-6 py-3 transition-colors hover:bg-graphite hover:text-cararra"
        >
          Continue shopping
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-12 md:py-16">
      <H1 className="mb-8">CHECKOUT</H1>
      <EmbeddedCheckout lines={checkoutLines} />
    </Container>
  );
}
