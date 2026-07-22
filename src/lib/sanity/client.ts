import { createClient } from 'next-sanity';
import { publicEnv, SANITY_API_VERSION } from '@/lib/env';

/**
 * Read-only Sanity client for the storefront. Uses the CDN for cached,
 * inexpensive reads. Safe to use on server and (public data only) client.
 */
export const sanityClient = createClient({
  projectId: publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: publicEnv.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: true,
});
