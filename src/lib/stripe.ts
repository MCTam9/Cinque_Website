import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from './serverEnv';

/**
 * Server-only Stripe SDK singleton. The secret key never leaves the server.
 * apiVersion is pinned so webhook payload shapes don't shift under us.
 */
export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  // Pinned to the version the installed SDK targets. Bump deliberately.
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  appInfo: { name: 'Cinque Storefront' },
});
