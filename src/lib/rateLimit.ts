import 'server-only';

/**
 * Best-effort in-memory rate limiter, shared by the public API routes.
 *
 * SCOPE — read before relying on this. State lives in the memory of ONE warm
 * serverless instance, so a client spraying across instances gets more than
 * `max` per window, and a cold start resets the count. It stops trivial floods
 * and accidental retry storms; it is NOT a substitute for an edge/WAF limiter.
 * Vercel's Firewall rate limiting is the real fix if this ever gets attacked.
 *
 * Callers namespace their own keys (e.g. `checkout:1.2.3.4`) so one route's
 * budget cannot be consumed by traffic to another.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Cap the map so a spray across many IPs can't grow it without bound for the
// life of the instance. Eviction is opportunistic — only expired buckets go.
const MAX_TRACKED = 10_000;

function evictExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Returns true when the caller has exceeded `max` requests in `windowMs`. */
export function rateLimit(
  key: string,
  { windowMs, max }: { windowMs: number; max: number }
): boolean {
  const now = Date.now();

  if (buckets.size >= MAX_TRACKED) evictExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > max;
}

/**
 * Client IP from the proxy header. Vercel always sets x-forwarded-for; the
 * 'unknown' fallback means non-proxied callers share a single bucket, which
 * fails closed (more limiting) rather than open.
 */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
