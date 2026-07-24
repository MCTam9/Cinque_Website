import { NextResponse, type NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';
import { revalidateFor, slugOf, type SanityWebhookBody } from '@/lib/sanity/webhookHandlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sanity → Next on-demand revalidation, on its own endpoint.
 *
 * On Sanity's free plan (two webhooks) you don't need this: point a single
 * webhook at /api/sanity/hook instead, which revalidates *and* runs the Stripe
 * and order automations. This endpoint stays for setups that split the jobs
 * across separate webhooks; both share `revalidateFor`.
 *
 *   Projection: { _type, "slug": slug.current }
 *   Secret:     SANITY_REVALIDATE_SECRET
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.SANITY_REVALIDATE_SECRET || serverEnv.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    // Without a secret `parseBody` cannot validate and every delivery fails as
    // "unauthorized" — which reads like a signing problem rather than a missing
    // env var. Fail loudly instead.
    console.error('[revalidate] SANITY_REVALIDATE_SECRET is not configured');
    return NextResponse.json({ error: 'Revalidation not configured.' }, { status: 500 });
  }

  try {
    const { isValidSignature, body } = await parseBody<SanityWebhookBody>(req, secret);

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
    if (!body?._type) {
      return NextResponse.json({ error: 'Bad payload.' }, { status: 400 });
    }

    const paths = revalidateFor(body._type, slugOf(body));

    return NextResponse.json({ revalidated: paths.length > 0, type: body._type, paths });
  } catch (err) {
    console.error('[revalidate] error', err);
    return NextResponse.json({ error: 'Revalidation failed.' }, { status: 500 });
  }
}
