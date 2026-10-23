import 'server-only';
import { publicEnv } from '@/lib/env';

/**
 * Who may see customer details in the Admin: a person signed in to the
 * Studio (not an API token) with an administrator or editor role. The Studio
 * sends its login token; it's checked against Sanity's /users/me.
 */

const ALLOWED_ROLES = new Set(['administrator', 'editor']);
const CACHE_MS = 5 * 60_000;

// Per-instance: a few minutes keeps the Admin's live refreshes cheap.
const userCache = new Map<string, number>(); // token → allowed until

/** True when `token` belongs to a person on this project who may edit orders. */
export async function isStudioEditor(token: string): Promise<boolean> {
  const until = userCache.get(token);
  if (until && until > Date.now()) return true;
  const res = await fetch(
    `https://${publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/users/me`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  ).catch(() => null);
  if (!res?.ok) return false;
  const me = (await res.json().catch(() => null)) as {
    id?: string;
    provider?: string;
    roles?: { name?: string }[];
  } | null;
  const allowed =
    Boolean(me?.id) &&
    // API (robot) tokens report this provider; only real logins get in.
    me?.provider !== 'sanity-token' &&
    (me?.roles ?? []).some((r) => ALLOWED_ROLES.has(r.name ?? ''));
  if (allowed) userCache.set(token, Date.now() + CACHE_MS);
  return allowed;
}

/** The bearer token on a request, if any. */
export const bearerToken = (req: Request) =>
  req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/)?.[1];
