import 'server-only';
import { createClient } from 'next-sanity';
import { publicEnv, SANITY_API_VERSION } from '@/lib/env';
import { serverEnv } from '@/lib/serverEnv';

/**
 * Server-only Sanity client with WRITE access. Used exclusively by trusted
 * server code (the Stripe webhook) to deduct inventory and create orders.
 * The write token must never reach the client — enforced by `server-only`.
 */
export const sanityWriteClient = createClient({
  projectId: publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: publicEnv.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: serverEnv.SANITY_API_WRITE_TOKEN,
  useCdn: false, // writes and fresh reads must bypass the CDN
});
