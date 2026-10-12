'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { writePrefill } from '@/lib/shop/checkoutEmail';
import Container, { statusPadY } from '@/components/Container';
import { H1, P1 } from '@/components/typography';
import type { CartLine } from '@/types';

/**
 * Where a checkout reminder's "Return to checkout" link lands: puts the same
 * pieces back in the cart (at today's prices) and goes on to checkout with
 * the email and country already filled in.
 */
export default function RestoreCartPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    (async () => {
      try {
        const res = await fetch(
          `/api/cart/restore?s=${encodeURIComponent(params.get('s') ?? '')}&t=${encodeURIComponent(params.get('t') ?? '')}`,
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'We couldn’t restore this checkout.');
        useCart.setState({ lines: body.lines as CartLine[] });
        writePrefill({
          email: body.email,
          country: body.country,
          recoveredFrom: body.recoveredFrom,
        });
        router.replace('/checkout');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'We couldn’t restore this checkout.');
      }
    })();
  }, [router]);

  return (
    <Container className={statusPadY}>
      <H1 className="mb-[20px]">CHECKOUT</H1>
      {error ? (
        <>
          <P1 className="mb-[20px] text-graphite">{error}</P1>
          <Link href="/shop" className="btn">
            Continue shopping
          </Link>
        </>
      ) : (
        <P1 className="text-oslo">Bringing back your checkout…</P1>
      )}
    </Container>
  );
}
