import { createClient } from 'next-sanity';
import { publicEnv, SANITY_API_VERSION } from '@/lib/env';

/**
 * Read Sanity client for the storefront.
 *
 * Read-only token, and deliberately no fallback to SANITY_API_WRITE_TOKEN.
 * The storefront only ever reads, so putting a write-capable credential on
 * that path buys nothing and costs the blast radius if it ever leaks. An
 * unset token is a legitimate configuration once the dataset is public —
 * `undefined` here simply means anonymous reads.
 *
 * All storefront fetching happens in server components / route handlers, so
 * the token is never bundled to the browser: non-public env vars are stripped
 * from client bundles, leaving this undefined there either way.
 */
const readToken = process.env.SANITY_API_READ_TOKEN;

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
