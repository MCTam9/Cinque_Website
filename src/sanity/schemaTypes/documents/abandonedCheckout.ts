import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Unpaid checkouts, written by the Stripe webhook when a checkout expires
 * (src/lib/stripe/cartReminder.ts): one per buyer per day, so the extra
 * checkouts opened by changing country collapse into one. Read-only.
 *
 * NO CUSTOMER DETAILS, like orders: the address stays in Stripe, on the
 * checkout session; `emailKey` is a SHA-256 of it, only to match a later
 * order. The dotted id (`abandonedCheckout.…`) also keeps these token-only.
 */
export const abandonedCheckout = defineType({
  name: 'abandonedCheckout',
  title: 'Unpaid checkout',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({ name: 'lastCheckoutAt', title: 'Checkout started', type: 'datetime' }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'abandonedItem',
          fields: [
            defineField({ name: 'title', type: 'string' }),
            defineField({ name: 'sku', type: 'string' }),
            defineField({ name: 'quantity', type: 'number' }),
            defineField({ name: 'size', type: 'string' }),
            defineField({ name: 'amountGBP', title: 'Amount (pence)', type: 'number' }),
          ],
          preview: {
            select: { title: 'title', size: 'size', quantity: 'quantity', amount: 'amountGBP' },
            prepare: ({ title, size, quantity, amount }) => ({
              title,
              subtitle: [
                quantity > 1 && `× ${quantity}`,
                size && `size ${size}`,
                typeof amount === 'number' && `£${(amount / 100).toFixed(2)}`,
              ]
                .filter(Boolean)
                .join(' / '),
            }),
          },
        }),
      ],
    }),
    defineField({ name: 'valueGBP', title: 'Value before shipping (pence)', type: 'number' }),
    defineField({ name: 'country', title: 'Shipping to', type: 'string' }),
    defineField({ name: 'reminderSentAt', title: 'Reminder sent', type: 'datetime' }),
    defineField({
      name: 'optedOut',
      title: 'Opted out of reminders',
      type: 'boolean',
    }),
    defineField({ name: 'recoveredAt', title: 'Paid later', type: 'datetime' }),
    defineField({ name: 'orderNumber', title: 'Order', type: 'string' }),
    defineField({
      name: 'viaReminder',
      title: 'Came back through the reminder',
      type: 'boolean',
    }),
    defineField({
      name: 'stripeSessionId',
      title: 'Stripe checkout session',
      type: 'string',
      description: 'The buyer’s email is on this session in Stripe, not stored here.',
    }),
    defineField({ name: 'emailKey', type: 'string', hidden: true }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'newest',
      by: [{ field: 'lastCheckoutAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      first: 'items.0.title',
      count: 'items.length',
      value: 'valueGBP',
      country: 'country',
      at: 'lastCheckoutAt',
      sent: 'reminderSentAt',
      optedOut: 'optedOut',
      paid: 'recoveredAt',
      order: 'orderNumber',
    },
    prepare: ({ first, count, value, country, at, sent, optedOut, paid, order }) => ({
      title: [first, count > 1 && `+ ${count - 1} more`].filter(Boolean).join(' '),
      subtitle: [
        at && new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        typeof value === 'number' && `£${(value / 100).toFixed(0)}`,
        country,
        paid ? `paid (${order})` : sent ? 'reminded' : optedOut ? 'no reminder (opted out)' : null,
      ]
        .filter(Boolean)
        .join(' / '),
    }),
  },
});

/** Addresses (as SHA-256 keys) that asked for no checkout reminders. Internal. */
export const reminderOptOut = defineType({
  name: 'reminderOptOut',
  title: 'Reminder opt-out (Internal)',
  type: 'document',
  readOnly: true,
  fields: [defineField({ name: 'createdAt', type: 'datetime' })],
});

/** When an address (SHA-256 key) last got a checkout reminder. Internal. */
export const cartReminder = defineType({
  name: 'cartReminder',
  title: 'Checkout reminder log (Internal)',
  type: 'document',
  readOnly: true,
  fields: [defineField({ name: 'sentAt', type: 'datetime' })],
});
