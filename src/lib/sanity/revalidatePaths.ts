/**
 * Which routes render a given Sanity document type. Keep this in step with the
 * app router — a type missing here means edits to it never reach the site.
 *
 * Shared by the unified webhook (/api/sanity/hook) and the standalone
 * revalidation endpoint (/api/revalidate).
 */
import { CATEGORY_PATHS } from '@/lib/shop/categories';

export function pathsFor(type: string, slug?: string): string[] {
  switch (type) {
    // The Home singleton: tagline + the four section galleries.
    case 'homePage':
      return ['/'];

    // The Studio singleton: About copy, imagery and contact details.
    case 'studioPage':
      return ['/studio'];

    // Products appear in the catalog grid and on their own detail page.
    // NOTE: the catalog lives at /shop (it moved from /products) — revalidating
    // the old path is a silent no-op; the redirect does not forward it.
    // The four category listings are prerendered too, and a product can move
    // between categories, so refresh all of them rather than trying to work out
    // which one changed (the webhook payload does not carry `category`).
    case 'product':
      return slug
        ? ['/shop', ...CATEGORY_PATHS, `/shop/${slug}`]
        : ['/shop', ...CATEGORY_PATHS];

    // A Drop powers the Lookbook page, the Home drop list, the Shop grid
    // (via the product's reference), and its own page-builder page.
    case 'drop':
      return slug
        ? ['/', '/shop', '/lookbook', `/collections/${slug}`]
        : ['/', '/shop', '/lookbook'];

    // Press entries render in full on the listing page as well as their own.
    case 'press':
      return slug ? ['/press', `/press/${slug}`] : ['/press'];

    case 'page':
      return slug ? [`/pages/${slug}`] : [];

    // order / stripeEvent and anything else is not rendered publicly.
    default:
      return [];
  }
}
