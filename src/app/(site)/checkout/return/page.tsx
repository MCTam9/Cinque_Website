import { redirect } from 'next/navigation';
import Link from 'next/link';
import { publicEnv } from '@/lib/env';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';
import ClearCartOnMount from '@/components/checkout/ClearCartOnMount';

/**
 * Post-checkout return page. Stripe redirects here with ?session_id=...
 * We look up the session server-side and only show a confirmation when the
 * payment actually succeeded. Fulfillment/inventory is handled by the webhook.
 */

const btn =
  'type-p1 inline-block border border-graphite px-6 py-3 transition-colors hover:bg-graphite hover:text-cararra';

type SessionInfo = {
  status?: string; // open | complete | expired
  paymentStatus?: string; // paid | unpaid | no_payment_required
  customerEmail?: string | null;
};

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect('/');

  // Look the session up defensively — a failed lookup must not throw into a
  // chrome-less error page; we degrade to a "couldn't confirm" state instead.
  let data: SessionInfo | null = null;
  let lookupFailed = false;
  try {
    const res = await fetch(
      `${publicEnv.NEXT_PUBLIC_SITE_URL}/api/checkout/session?session_id=${session_id}`,
      { cache: 'no-store' }
    );
    if (res.ok) data = (await res.json()) as SessionInfo;
    else lookupFailed = true;
  } catch {
    lookupFailed = true;
  }

  // Payment not completed but the session is still open — send back to finish.
  // (redirect() throws NEXT_REDIRECT, so it must live outside the try/catch.)
  if (data?.status === 'open') redirect('/checkout');

  const paid = data?.status === 'complete' && data?.paymentStatus === 'paid';

  // 1) Confirmed & paid → thank you, clear the cart, offer onward navigation.
  if (paid) {
    return (
      <Container className="py-[60px] md:py-[80px]">
        <ClearCartOnMount />
        <H1 className="mb-5">Thank you</H1>
        <P1 className="mb-2">
          Your order is confirmed{data?.customerEmail ? `, ${data.customerEmail}` : ''}.
        </P1>
        <P1 className="mb-8 text-oslo">A confirmation email will follow shortly.</P1>
        <Link href="/shop" className={btn}>
          Continue shopping
        </Link>
      </Container>
    );
  }

  // 2) Couldn't confirm (lookup failed) or payment still processing
  //    (session complete but not yet paid, e.g. an async method) → neutral,
  //    don't clear the cart, point to email/contact.
  if (lookupFailed || data?.status === 'complete') {
    return (
      <Container className="py-[60px] md:py-[80px]">
        <H1 className="mb-5">Order received</H1>
        <P1 className="mb-2">
          We&rsquo;re confirming your payment. If it went through, a confirmation email will
          follow shortly.
        </P1>
        <P1 className="mb-8 text-oslo">
          If you were charged and don&rsquo;t hear from us, please get in touch.
        </P1>
        <div className="flex flex-wrap gap-[10px]">
          <Link href="/shop" className={btn}>
            Continue shopping
          </Link>
          <Link href="/studio#contact" className={btn}>
            Contact us
          </Link>
        </div>
      </Container>
    );
  }

  // 3) Session expired (or otherwise not completed) → no order, no charge.
  return (
    <Container className="py-[60px] md:py-[80px]">
      <H1 className="mb-5">Payment not completed</H1>
      <P1 className="mb-2">
        Your payment wasn&rsquo;t completed, so no order was placed and you haven&rsquo;t been
        charged.
      </P1>
      <P1 className="mb-8 text-oslo">
        Your cart is still saved — you can try again whenever you&rsquo;re ready.
      </P1>
      <div className="flex flex-wrap gap-[10px]">
        <Link href="/cart" className={btn}>
          Return to cart
        </Link>
        <Link href="/shop" className={btn}>
          Continue shopping
        </Link>
      </div>
    </Container>
  );
}
