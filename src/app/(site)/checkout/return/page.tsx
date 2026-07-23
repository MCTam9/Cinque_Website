import { redirect } from 'next/navigation';
import { publicEnv } from '@/lib/env';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

/**
 * Post-checkout return page. Stripe redirects here with ?session_id=...
 * We check the session status server-side and show a confirmation.
 * (Fulfillment/inventory is handled by the webhook, not here.)
 */
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect('/');

  const res = await fetch(
    `${publicEnv.NEXT_PUBLIC_SITE_URL}/api/checkout/session?session_id=${session_id}`,
    { cache: 'no-store' }
  );
  const data = (await res.json()) as {
    status?: string;
    paymentStatus?: string;
    customerEmail?: string | null;
  };

  if (data.status === 'open') {
    // Payment not completed — send back to checkout.
    redirect('/checkout');
  }

  return (
    <Container className="py-16 md:py-24">
      <H1 className="mb-4">Thank you</H1>
      <P1>Your order is confirmed{data.customerEmail ? `, ${data.customerEmail}` : ''}.</P1>
      <P1 className="text-oslo">A confirmation email will follow shortly.</P1>
    </Container>
  );
}
