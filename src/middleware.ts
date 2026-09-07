import { NextRequest, NextResponse } from 'next/server';

/**
 * Content-Security-Policy, applied per-request.
 *
 * LOCATION MATTERS: this file must live at `src/middleware.ts`, not the repo
 * root. Next only loads middleware from the project root *or* `src/`, and this
 * project keeps its app in `src/app`. It sat at the root until 2026-09-07,
 * which meant it never ran and the site shipped no CSP at all. If you move it,
 * verify with `curl -D- <url> | grep -i content-security` — an inert middleware
 * fails silently.
 *
 * ── Three policies ────────────────────────────────────────────────────────
 *
 * 1. Storefront (default): script-src allows 'unsafe-inline'. This is a
 *    deliberate trade, not an oversight. Next's App Router ships its hydration
 *    payload as ~14 inline `self.__next_f.push(...)` scripts per page. Next
 *    nonces those by reading the CSP *request* header at render time, but
 *    nothing in the ISR cache key accounts for the nonce — so a prerendered
 *    page has no nonce baked in, and serving it under a nonce-only policy
 *    blocks every one of those scripts: no hydration, dead nav, dead cart,
 *    dead gallery. Requiring a nonce here would mean forcing every storefront
 *    route to render per request, which is exactly what the SEO work removed.
 *
 *    What this policy still buys: `object-src 'none'`, `base-uri 'self'`,
 *    `form-action 'self'`, `frame-ancestors 'none'`, no `unsafe-eval`, and a
 *    tight `connect-src` that limits where a successful injection could
 *    exfiltrate to. The residual risk is low here because the storefront
 *    renders no user-supplied content: everything comes from Sanity via
 *    authenticated editors, through `@portabletext/react`, which builds React
 *    elements and never injects raw HTML.
 *
 * 2. Checkout (/cart, /checkout): nonce-based, no 'unsafe-inline'. These are
 *    the pages that touch money and personal data, so they get the strict
 *    policy and pay for it with dynamic rendering (see the `force-dynamic` in
 *    their layouts). That costs nothing in search terms — both are noindexed.
 *
 * 3. /admin (Sanity Studio): a client app that needs 'unsafe-inline',
 *    'unsafe-eval' and blob: workers. A strict policy white-screens it, so it
 *    gets its own scoped policy.
 */

/** Stripe.js, Embedded Checkout and Stripe's fraud-signal frame. */
const STRIPE_SCRIPT = 'https://js.stripe.com';
const STRIPE_FRAME = 'https://js.stripe.com https://*.stripe.com https://hooks.stripe.com https://m.stripe.network';
const STRIPE_CONNECT = 'https://api.stripe.com https://m.stripe.network';

// `upgrade-insecure-requests` would rewrite http://localhost subresources to
// https in local dev, so it is production-only.
const isProd = process.env.NODE_ENV === 'production';

function baseDirectives(): string[] {
  return [
    `default-src 'self'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://cdn.sanity.io https://*.stripe.com`,
    `font-src 'self' data:`,
    `connect-src 'self' ${STRIPE_CONNECT} https://*.sanity.io wss://*.sanity.io`,
    `frame-src ${STRIPE_FRAME}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ];
}

/** Cacheable storefront policy — see note 1 above on 'unsafe-inline'. */
function buildStorefrontCsp(): string {
  return [`script-src 'self' 'unsafe-inline' ${STRIPE_SCRIPT}`, ...baseDirectives()].join('; ');
}

/** Strict, nonce-based policy for the checkout flow. */
function buildCheckoutCsp(nonce: string): string {
  return [
    `script-src 'self' 'nonce-${nonce}' ${STRIPE_SCRIPT}`,
    ...baseDirectives(),
  ].join('; ');
}

function buildStudioCsp(): string {
  // Sanity Studio requirements. Kept permissive but still scoped to Studio.
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://core.sanity-cdn.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://cdn.sanity.io https://*.sanity.io`,
    `font-src 'self' data:`,
    // sanity-cdn.com is where the Studio fetches its auto-update manifest;
    // without it the Studio logs a CSP error on every load.
    `connect-src 'self' https://*.sanity.io wss://*.sanity.io https://*.api.sanity.io https://*.sanity-cdn.com`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
  ].join('; ');
}

/** The checkout flow, which gets the strict policy. */
function isCheckoutPath(pathname: string): boolean {
  return ['/cart', '/checkout'].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sanity Studio (CMS editor) is mounted at /admin and needs the relaxed CSP.
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', buildStudioCsp());
    return response;
  }

  if (isCheckoutPath(pathname)) {
    // Fresh nonce per request (Edge-compatible).
    const nonce = btoa(crypto.randomUUID());
    const csp = buildCheckoutCsp(nonce);

    // Next reads the nonce out of the CSP on the *request* headers to nonce its
    // own inline bootstrap scripts, so it has to be set on both.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', buildStorefrontCsp());
  return response;
}

export const config = {
  // Everything except static assets and the image optimizer. Note there is no
  // prefetch exclusion: skipping prefetches would leave some responses without
  // a policy, and the header is cheap to set.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
