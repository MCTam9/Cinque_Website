'use client';

import Link from 'next/link';
import { useCart } from '@/store/cart';
import { EmbeddedCheckout } from '@/components/checkout/EmbeddedCheckout';
import Container, { contentPadY } from '@/components/Container';
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
      <Container className={contentPadY}>
        <H1 className="mb-[20px]">CHECKOUT</H1>
        <P1 className="mb-[20px] text-oslo">Your cart is empty.</P1>
        <Link href="/shop" className="btn">
          Continue shopping
        </Link>
      </Container>
    );
  }

  return (
    <Container className={contentPadY}>
      <H1 className="mb-[30px]">CHECKOUT</H1>
      <EmbeddedCheckout lines={checkoutLines} />
    </Container>
  );
}
