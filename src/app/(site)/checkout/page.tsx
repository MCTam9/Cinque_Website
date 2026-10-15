import { headers } from 'next/headers';
import Announcements from '@/components/Announcements';
import { CheckoutView } from '@/components/checkout/CheckoutView';
import { HOME_COUNTRY, isShipCountry, visitorOutside } from '@/lib/shop/shipping';

/**
 * Checkout — mounts Stripe Embedded Checkout with the current cart.
 * The /api/checkout route re-validates prices and stock server-side.
 *
 * The destination country is pre-filled from the visitor's location (Vercel
 * sets `x-vercel-ip-country` on every request), so most buyers never touch
 * it. A visitor somewhere we don't ship to gets no country at all and must
 * pick one: pre-selecting the UK let a buyer in France pay for UK delivery
 * with a French address. They then confirm the address really is in the
 * country they chose before Stripe's form opens. No header (local dev) falls
 * back to the UK. This
 * route already renders per request (see layout.tsx), so reading headers
 * costs nothing.
 */
export default async function CheckoutPage() {
  const detected = (await headers()).get('x-vercel-ip-country');
  const defaultCountry = !detected ? HOME_COUNTRY : isShipCountry(detected) ? detected : null;
  return (
    <CheckoutView
      defaultCountry={defaultCountry}
      visitor={visitorOutside(detected)}
      announcements={<Announcements page="checkout" />}
    />
  );
}
