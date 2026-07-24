import { NextRequest, NextResponse } from 'next/server';

/**
 * Content-Security-Policy, applied per-request.
 *
 * Two policies:
 *  1. Storefront (strict, nonce-based): scripts only from 'self' + the nonce +
 *     js.stripe.com. Embedded Checkout also needs Stripe's iframe (frame-src)
 *     and API (connect-src). Sanity CDN is allowed for images only.
 *  2. /admin (relaxed): the Sanity Studio is a client app that needs
 *     'unsafe-inline'/'unsafe-eval'/blob: workers and *.sanity.io. A strict
 *     nonce policy would white-screen it, so it gets its own scoped policy.
 *
 * CACHING — read before "optimising" this file. The nonce is minted per
 * request and passed down via request headers (Next reads it from the CSP
 * header to nonce its own inline bootstrap scripts). A per-request nonce means
 * HTML can never be shared from the CDN cache, so every page is rendered on
 * demand and `export const revalidate` on the storefront pages is largely
 * moot. That is a deliberate trade: it costs one render per view, and in
 * exchange CMS edits are visible on the next request with no revalidation
 * step at all. Removing the nonce would restore full-route caching — and
 * reintroduce stale-content windows — so only do it knowingly.
 */

function buildStorefrontCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    // Stripe.js from js.stripe.com; Next inline bootstrap via nonce.
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com`,
    // Tailwind/runtime injects inline styles.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://cdn.sanity.io https://*.stripe.com`,
    `font-src 'self' data:`,
    // Stripe API + Sanity read API.
    `connect-src 'self' https://api.stripe.com https://*.sanity.io wss://*.sanity.io`,
    // Embedded Checkout renders inside a Stripe-hosted iframe.
    `frame-src https://js.stripe.com https://*.stripe.com https://hooks.stripe.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
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

export function middleware(request: NextRequest) {
  // Sanity Studio (CMS editor) is mounted at /admin and needs the relaxed CSP.
  const isStudio = request.nextUrl.pathname.startsWith('/admin');

  if (isStudio) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', buildStudioCsp());
    return response;
  }

  // Generate a fresh nonce per request (Edge-compatible).
  const nonce = btoa(crypto.randomUUID());
  const csp = buildStorefrontCsp(nonce);

  // Pass the nonce + CSP down via request headers so Next can nonce its own
  // scripts, and the root layout can read the nonce for any inline needs.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Run on all paths except static assets and image optimization.
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
