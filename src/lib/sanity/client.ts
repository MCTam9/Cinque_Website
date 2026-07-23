import { createClient } from 'next-sanity';
import { publicEnv, SANITY_API_VERSION } from '@/lib/env';

/**
 * Read Sanity client for the storefront.
 *
 * Reads are authenticated with a server-only token: this dataset does not serve
 * content to anonymous clients, and token-based reads are Sanity's recommended
 * pattern regardless. All storefront fetching happens in server components /
 * route handlers, so the token is never bundled to the browser — non-public env
 * vars are stripped from client bundles, leaving `token` undefined there.
 * Prefer a dedicated read-only token (SANITY_API_READ_TOKEN); fall back to the
 * write token so a single-token setup still works.
 */
const readToken =
  process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN;

export const sanityClient = createClient({
  projectId: publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: publicEnv.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: readToken,
  // CDN in production (cached, cheap). Fresh in dev so newly-edited content
  // shows immediately instead of lagging behind the CDN cache.
  useCdn: process.env.NODE_ENV === 'production',
  perspective: 'published',
});
