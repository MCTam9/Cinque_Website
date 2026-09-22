import { headers } from 'next/headers';
import { CheckoutView } from '@/components/checkout/CheckoutView';
import { HOME_COUNTRY, isShipCountry } from '@/lib/shop/shipping';

/**
 * Checkout — mounts Stripe Embedded Checkout with the current cart.
 * The /api/checkout route re-validates prices and stock server-side.
 *
 * The destination country is pre-filled from the visitor's location (Vercel
 * sets `x-vercel-ip-country` on every request), so most buyers never touch
 * it. Anywhere we don't ship to — or no header, as in local dev — falls back
 * to the UK. This route already renders per request (see layout.tsx), so
 * reading headers costs nothing.
 */
export default async function CheckoutPage() {
  const detected = (await headers()).get('x-vercel-ip-country');
  return <CheckoutView defaultCountry={isShipCountry(detected) ? detected : HOME_COUNTRY} />;
}
