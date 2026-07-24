/**
 * Which routes render a given Sanity document type. Keep this in step with the
 * app router — a type missing here means edits to it never reach the site.
 *
 * Shared by the unified webhook (/api/sanity/hook) and the standalone
 * revalidation endpoint (/api/revalidate).
 */
export function pathsFor(type: string, slug?: string): string[] {
  switch (type) {
    // The Home singleton: tagline + the four section galleries.
    case 'homePage':
      return ['/'];

    // Drops power the Lookbook page and the drop links on Home.
    case 'lookbookDrop':
      return ['/', '/lookbook'];

    // Products appear in the catalog grid and on their own detail page.
    // NOTE: the catalog lives at /shop (it moved from /products) — revalidating
    // the old path is a silent no-op; the redirect does not forward it.
    case 'product':
      return slug ? ['/shop', `/shop/${slug}`] : ['/shop'];

    // Collections label product cards and have their own page-builder page.
    case 'collection':
      return slug ? ['/shop', `/collections/${slug}`] : ['/shop'];

    // Exhibitions render in full on the listing page as well as their own.
    case 'exhibition':
      return slug ? ['/exhibitions', `/exhibitions/${slug}`] : ['/exhibitions'];

    case 'page':
      return slug ? [`/pages/${slug}`] : [];

    // No route renders press items yet — add one here when /press ships.
    case 'pressItem':
      return [];

    // order / stripeEvent and anything else is not rendered publicly.
    default:
      return [];
  }
}
