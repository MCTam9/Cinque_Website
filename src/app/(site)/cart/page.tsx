import { headers } from 'next/headers';
import Announcements from '@/components/Announcements';
import CartView from '@/components/CartView';
import { visitorOutside } from '@/lib/shop/shipping';

/**
 * Cart. Renders per request anyway (see layout.tsx), so it reads the
 * visitor's country (Vercel's `x-vercel-ip-country`) to warn anyone somewhere
 * we don't ship to before they reach checkout.
 */
export default async function CartPage() {
  const visitor = visitorOutside((await headers()).get('x-vercel-ip-country'));
  return <CartView visitor={visitor} announcements={<Announcements page="cart" />} />;
}
