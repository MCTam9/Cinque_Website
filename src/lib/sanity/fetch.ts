import 'server-only';
import { sanityClient } from './client';

interface FetchArgs<T> {
  /** Short name used in the log line, e.g. "homePage" or "product:lace-earring". */
  label: string;
  query: string;
  params?: Record<string, unknown>;
  /** Returned when the read fails, so a CMS outage degrades to placeholders. */
  fallback: T;
}

/**
 * Read from Sanity, falling back to built-in placeholder content if the read
 * fails — but never silently.
 *
 * Every storefront page degrades gracefully when Sanity is unreachable (Figma
 * strips on Home, "No press listed yet", and so on). Without a log line
 * that failure is indistinguishable from "nothing has been published yet",
 * which is exactly how a revoked token or a mistyped dataset stays invisible
 * for weeks. This logs once, loudly, then degrades.
 */
export async function sanityFetch<T>({
  label,
  query,
  params,
  fallback,
}: FetchArgs<T>): Promise<T> {
  try {
    return await sanityClient.fetch<T>(query, params ?? {});
  } catch (err) {
    console.error(`[sanity] read "${label}" failed — serving fallback content`, err);
    return fallback;
  }
}
