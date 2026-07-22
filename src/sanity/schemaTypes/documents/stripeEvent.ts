import { defineField, defineType } from 'sanity';

/**
 * Idempotency ledger for Stripe webhook events. The webhook creates one doc
 * per processed event (using the Stripe event id as the Sanity _id) so that
 * Stripe retries do not double-process (e.g. deduct inventory twice).
 * These are managed programmatically; hidden from the Studio's create menu.
 */
export const stripeEvent = defineType({
  name: 'stripeEvent',
  title: 'Stripe Event (Internal)',
  type: 'document',
  fields: [
    defineField({ name: 'type', title: 'Event Type', type: 'string', readOnly: true }),
    defineField({ name: 'processedAt', title: 'Processed At', type: 'datetime', readOnly: true }),
  ],
  preview: {
    select: { title: 'type', subtitle: 'processedAt' },
  },
});
