import 'server-only';
import { revalidatePath } from 'next/cache';
import { sanityWriteClient } from './writeClient';
import { pathsFor } from './revalidatePaths';
import { syncProductToStripe, type SyncVariantInput } from '@/lib/stripe/sync';
import { sendShippingConfirmation } from '@/lib/fulfillment/email';

/**
 * The three things a Sanity content change can trigger, as plain functions so
 * they can be driven either by one unified webhook (/api/sanity/hook) or by
 * three separate ones — Sanity's free plan allows only two, hence the union.
 */

/**
 * One payload shape covering every document type. A single webhook projection
 * asks for all of these fields; GROQ yields null for the ones that don't exist
 * on the document that changed, and each handler reads only its own.
 *
 * `status` is deliberately shared: products use active/draft/sold_out, orders
 * use paid/shipped/refunded. Dispatching on `_type` keeps them apart.
 */
export interface SanityWebhookBody {
  _type?: string;
  _id?: string;
  slug?: { current?: string } | string;
  // product
  title?: string;
  status?: string;
  variants?: SyncVariantInput[];
  // order
  orderNumber?: string;
  email?: string | null;
  carrier?: string | null;
  tracking?: string | null;
  sentAt?: string | null;
}

/** Normalize the slug, which a projection may deliver as a string or object. */
export function slugOf(body: SanityWebhookBody): string | undefined {
  return typeof body.slug === 'string' ? body.slug : body.slug?.current;
}

/** Refresh every route that renders this document type. */
export function revalidateFor(type: string, slug?: string): string[] {
  const paths = pathsFor(type, slug);
  for (const path of paths) revalidatePath(path);

  // Log the no-op case: a webhook firing for a type nothing renders is the
  // difference between "revalidation is broken" and "nothing to do".
  if (paths.length === 0) {
    console.warn(`[sanity-hook] no routes render "${type}" — nothing revalidated`);
  }
  return paths;
}

/**
 * Ensure every variant has a Stripe Product + Price, and record the IDs.
 *
 * Loop-safe: `syncProductToStripe` returns a patch only when an ID actually
 * changed, so the write-back below makes the follow-up webhook delivery a
 * no-op instead of bouncing forever.
 */
export async function syncProduct(body: SanityWebhookBody): Promise<number> {
  if (!body._id || !body.title) return 0;

  const patches = await syncProductToStripe({
    _id: body._id,
    title: body.title,
    status: body.status ?? 'draft',
    variants: body.variants,
  });
  if (patches.length === 0) return 0;

  const tx = sanityWriteClient.transaction();
  for (const p of patches) {
    const set: Record<string, string> = {};
    if (p.stripeProductId) {
      set[`variants[_key=="${p._key}"].stripeProductId`] = p.stripeProductId;
    }
    if (p.stripePriceId) {
      set[`variants[_key=="${p._key}"].stripePriceId`] = p.stripePriceId;
    }
    tx.patch(body._id, (patch) => patch.set(set));
  }
  await tx.commit({ autoGenerateArrayKeys: false });

  return patches.length;
}

/**
 * Email the customer their tracking details when staff flip an order to
 * "Shipped". Sends once — the shippedEmailSentAt stamp is both the guard
 * against a duplicate email and the thing that stops the webhook loop.
 */
export async function handleOrderUpdate(body: SanityWebhookBody): Promise<boolean> {
  if (!body._id) return false;

  const shouldEmail = body.status === 'shipped' && !!body.tracking && !body.sentAt;
  if (!shouldEmail) return false;

  const result = await sendShippingConfirmation({
    to: body.email,
    orderNumber: body.orderNumber ?? '',
    carrier: body.carrier,
    trackingNumber: body.tracking,
  });

  await sanityWriteClient
    .patch(body._id)
    .set({ 'fulfillment.shippedEmailSentAt': new Date().toISOString() })
    .commit();

  return result.ok;
}
