import { redirect } from 'next/navigation';
import { publicEnv } from '@/lib/env';

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
    <main>
      <h1>Thank you</h1>
      <p>Your order is confirmed{data.customerEmail ? `, ${data.customerEmail}` : ''}.</p>
      <p>A confirmation email will follow shortly.</p>
    </main>
  );
}
