import { NextResponse, type NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/serverEnv';
import {
  handleOrderUpdate,
  revalidateFor,
  slugOf,
  syncProduct,
  type SanityWebhookBody,
} from '@/lib/sanity/webhookHandlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ─────────────────────────────────────────────────────────────
 * THE Sanity webhook — one endpoint, every automation
 * ─────────────────────────────────────────────────────────────
 * Sanity's free plan allows two webhooks, and this project has three jobs to
 * do on a content change (revalidate the site, sync products to Stripe, email
 * shipping confirmations). Rather than ration them, one webhook sends a union
 * projection covering all three and this route dispatches on `_type`. The
 * standalone endpoints (/api/revalidate, /api/sanity/sync-stripe,
 * /api/sanity/order-updated) still work and share the same handlers, so a
 * paid plan can split them back out without touching any logic.
 *
 * Configure in Manage → API → Webhooks:
 *   URL:        https://<your-domain>/api/sanity/hook
 *   Trigger on: Create, Update, Delete
 *   Filter:     (none — one hook covers every type)
 *   Drafts:     off
 *   Secret:     SANITY_WEBHOOK_SECRET
 *   Projection:
 *     {
 *       _type, _id, "slug": slug.current, title, status,
 *       variants[]{ _key, sku, metalType, priceGBP, stripeProductId, stripePriceId },
 *       orderNumber,
 *       "email": customer.email,
 *       "carrier": fulfillment.carrier,
 *       "tracking": fulfillment.trackingNumber,
 *       "sentAt": fulfillment.shippedEmailSentAt
 *     }
 */
export async function POST(req: NextRequest) {
  // Accept the per-job secrets as fallbacks so an existing three-webhook setup
  // keeps working after the switch to a single hook.
  const secret =
    serverEnv.SANITY_WEBHOOK_SECRET ||
    serverEnv.SANITY_REVALIDATE_SECRET ||
    serverEnv.SANITY_STRIPE_SYNC_SECRET ||
    serverEnv.SANITY_ORDER_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[sanity-hook] SANITY_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  let body: SanityWebhookBody | null = null;
  try {
    const parsed = await parseBody<SanityWebhookBody>(req, secret);
    if (!parsed.isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
    body = parsed.body;
  } catch (err) {
    console.error('[sanity-hook] could not parse body', err);
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  if (!body?._type) {
    return NextResponse.json({ error: 'Bad payload.' }, { status: 400 });
  }

  // Sanity reports which operation fired; a deleted document must not be
  // pushed to Stripe or emailed about, but its routes still need refreshing.
  const operation = req.headers.get('sanity-operation') ?? 'update';
  const isDelete = operation === 'delete';

  const result: Record<string, unknown> = { type: body._type, operation };

  // 1. Always refresh whatever renders this document.
  result.paths = revalidateFor(body._type, slugOf(body));

  // 2. Products: keep Stripe in step with the catalog.
  if (body._type === 'product' && !isDelete) {
    try {
      result.updatedVariants = await syncProduct(body);
    } catch (err) {
      console.error('[sanity-hook] Stripe sync failed', err);
      // 500 → Sanity retries the delivery. Revalidation above already ran, and
      // the sync is idempotent, so a retry costs nothing.
      return NextResponse.json({ error: 'Stripe sync failed.' }, { status: 500 });
    }
  }

  // 3. Orders: email tracking details the first time one is marked shipped.
  if (body._type === 'order' && !isDelete) {
    try {
      result.emailed = await handleOrderUpdate(body);
    } catch (err) {
      console.error('[sanity-hook] order update failed', err);
      return NextResponse.json({ error: 'Order update failed.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
