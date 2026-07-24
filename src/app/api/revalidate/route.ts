import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sanity → Next on-demand revalidation. Configure a Sanity webhook (Manage →
 * API → Webhooks) pointing here, signed with SANITY_REVALIDATE_SECRET, with
 * this projection (no filter, so one webhook covers every document type):
 *
 *     { _type, "slug": slug.current }
 *
 * This keeps the site fresh with near-zero serverless cost (no polling / no
 * time-based rebuild of the whole site).
 */

/**
 * Which routes render a given document type. Keep this in step with the app
 * router — a type missing here means edits to it never reach the site.
 */
function pathsFor(type: string, slug?: string): string[] {
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

export async function POST(req: NextRequest) {
  const secret = serverEnv.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    // Without a secret `parseBody` cannot validate and every delivery fails as
    // "unauthorized" — which reads like a signing problem rather than a missing
    // env var. Fail loudly instead.
    console.error('[revalidate] SANITY_REVALIDATE_SECRET is not configured');
    return NextResponse.json({ error: 'Revalidation not configured.' }, { status: 500 });
  }

  try {
    const { isValidSignature, body } = await parseBody<{
      _type?: string;
      slug?: { current?: string } | string;
    }>(req, secret);

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
    if (!body?._type) {
      return NextResponse.json({ error: 'Bad payload.' }, { status: 400 });
    }

    const slug = typeof body.slug === 'string' ? body.slug : body.slug?.current;
    const paths = pathsFor(body._type, slug);

    for (const path of paths) revalidatePath(path);

    // Log the no-op case: a webhook firing for a type nothing renders is the
    // difference between "revalidation is broken" and "nothing to do".
    if (paths.length === 0) {
      console.warn(`[revalidate] no routes render "${body._type}" — nothing revalidated`);
    }

    return NextResponse.json({ revalidated: paths.length > 0, type: body._type, paths });
  } catch (err) {
    console.error('[revalidate] error', err);
    return NextResponse.json({ error: 'Revalidation failed.' }, { status: 500 });
  }
}
