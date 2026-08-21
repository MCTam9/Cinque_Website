import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Orders are created/finalized by the Stripe webhook, NOT by hand.
 * This document is the fulfilment worklist: what was bought, and how far along
 * it is. It powers the Studio's orders view and the shipping-confirmation
 * trigger.
 *
 * ── NO CUSTOMER PII LIVES HERE ──
 * The dataset is public (Sanity's free plan has no private datasets and no
 * document-level read grants), so every field below is world-readable at
 * `…/data/query/production?query=*[_type=="order"]`. Stripe is the system of
 * record for the buyer: email, name, phone and shipping address are read from
 * the Checkout Session at the point of use and never persisted here.
 * `stripeSessionId` is the join key back to Stripe — retrieving anything with
 * it requires the secret key.
 *
 * If you add a field, ask first whether you would be happy posting its value
 * publicly. If not, it belongs in Stripe.
 */
export const order = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  // Discourage manual creation from the "create new" menu.
  // (Editing existing orders for fulfillment status is still allowed.)
  fields: [
    defineField({
      name: 'orderNumber',
      title: 'Order Number',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Paid', value: 'paid' },
          { title: 'Fulfilling', value: 'fulfilling' },
          { title: 'Shipped', value: 'shipped' },
          { title: 'Delivered', value: 'delivered' },
          { title: 'Refunded', value: 'refunded' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
      },
      initialValue: 'paid',
    }),
    defineField({
      name: 'stripeSessionId',
      title: 'Stripe Checkout Session ID',
      type: 'string',
      readOnly: true,
      description:
        'Look this up in the Stripe dashboard for the buyer\u2019s email, name and shipping address.',
    }),
    defineField({
      name: 'stripePaymentIntentId',
      title: 'Stripe PaymentIntent ID',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'lines',
      title: 'Line Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'orderLine',
          fields: [
            defineField({
              name: 'product',
              title: 'Product',
              type: 'reference',
              to: [{ type: 'product' }],
              weak: true,
            }),
            defineField({ name: 'variantKey', title: 'Variant Key', type: 'string' }),
            defineField({ name: 'sku', title: 'SKU (snapshot)', type: 'string' }),
            defineField({ name: 'titleSnapshot', title: 'Title (snapshot)', type: 'string' }),
            defineField({ name: 'quantity', title: 'Quantity', type: 'number' }),
            defineField({
              name: 'unitPriceGBP',
              title: 'Unit Price (pence, snapshot)',
              type: 'number',
            }),
          ],
          preview: {
            select: { title: 'sku', qty: 'quantity' },
            prepare: ({ title, qty }) => ({ title, subtitle: `qty: ${qty}` }),
          },
        }),
      ],
    }),
    defineField({
      name: 'totalGBP',
      title: 'Total (pence)',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'gbp',
      readOnly: true,
    }),
    defineField({
      name: 'fulfillment',
      title: 'Fulfillment',
      type: 'object',
      fields: [
        defineField({ name: 'carrier', title: 'Carrier', type: 'string' }),
        defineField({ name: 'trackingNumber', title: 'Tracking Number', type: 'string' }),
        defineField({ name: 'shipStationOrderId', title: 'ShipStation Order ID', type: 'string' }),
        defineField({ name: 'shippedAt', title: 'Shipped At', type: 'datetime' }),
        defineField({
          name: 'shippedEmailSentAt',
          title: 'Shipping Email Sent At',
          type: 'datetime',
          readOnly: true,
          description: 'Set automatically when the customer is emailed. Do not edit.',
        }),
      ],
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      rows: 3,
      description:
        'Publicly readable \u2014 keep to fulfilment notes. Never paste a customer\u2019s name, address or contact details here.',
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'createdAtDesc',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'orderNumber', status: 'status', createdAt: 'createdAt' },
    prepare({ title, status, createdAt }) {
      const date = createdAt ? new Date(createdAt).toLocaleDateString('en-GB') : null;
      return { title: title || 'Order', subtitle: [status, date].filter(Boolean).join(' · ') };
    },
  },
});
