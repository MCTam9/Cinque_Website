import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sanity → Next on-demand revalidation. Configure a Sanity webhook (GROQ
 * projection incl. `_type` and `slug`) pointing here, signed with
 * SANITY_REVALIDATE_SECRET. This keeps the catalog fresh with near-zero
 * serverless cost (no polling / time-based rebuilds of the whole site).
 */
export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      _type?: string;
      slug?: { current?: string } | string;
    }>(req, serverEnv.SANITY_REVALIDATE_SECRET);

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
    if (!body?._type) {
      return NextResponse.json({ error: 'Bad payload.' }, { status: 400 });
    }

    // Revalidate affected surfaces based on the changed document type.
    const slug = typeof body.slug === 'string' ? body.slug : body.slug?.current;

    switch (body._type) {
      case 'product':
        revalidatePath('/products');
        if (slug) revalidatePath(`/products/${slug}`);
        break;
      case 'collection':
        revalidatePath('/products');
        if (slug) revalidatePath(`/collections/${slug}`);
        break;
      case 'exhibition':
        if (slug) revalidatePath(`/exhibitions/${slug}`);
        break;
      case 'page':
        if (slug) revalidatePath(`/pages/${slug}`);
        break;
      case 'pressItem':
        // Revalidate the press route once it's built.
        break;
    }

    return NextResponse.json({ revalidated: true, type: body._type });
  } catch (err) {
    console.error('[revalidate] error', err);
    return NextResponse.json({ error: 'Revalidation failed.' }, { status: 500 });
  }
}
