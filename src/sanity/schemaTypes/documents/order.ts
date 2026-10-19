import { defineArrayMember, defineField, defineType } from 'sanity';
import { CARRIERS } from '@/lib/fulfillment/tracking';
import { MAKING_TARGET_WEEKS } from '@/lib/shop/madeToOrder';

/**
 * Orders are created/finalized by the Stripe webhook, NOT by hand.
 * This document is the fulfilment worklist: what was bought, and how far along
 * it is. It powers the Studio's orders view and the shipping-confirmation
 * trigger.
 *
 * ── NO CUSTOMER PII LIVES HERE ──
 * The dataset is public: Sanity's free plan has no private datasets and no
 * document-level read grants. Stripe is the system of record for the buyer —
 * email, name, phone and shipping address are read from the Checkout Session
 * at the point of use and never persisted here. `stripeSessionId` is the join
 * key back to Stripe, and retrieving anything with it requires the secret key.
 *
 * Order documents happen to survive the public flip for a second reason: the
 * webhook ids them `order.<sessionId>`, and Sanity treats any `_id` containing
 * a `.` as token-only. That is a naming accident, not a policy — it evaporates
 * the moment someone "tidies up" the id scheme, and nothing in the type system
 * would catch it. Keep the dotted id, and do not let it be the thing standing
 * between a customer's address and the open internet.
 *
 * If you add a field, ask first whether you would be happy posting its value
 * publicly. If not, it belongs in Stripe.
 *
 * One deliberate, owner-approved exception (October 2026): a made-to-order
 * ring's engraving text and notes are kept on its order line, because the
 * workshop works from them. They can contain names, so they lean on the
 * dotted id above to stay token-only — another reason never to change it.
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
      name: 'source',
      title: 'Paid via',
      type: 'string',
      readOnly: true,
      options: { list: [{ title: 'Bespoke payment link', value: 'payment_link' }] },
      description: 'Empty for orders placed on the website.',
      hidden: ({ document }) => !document?.source,
    }),
    defineField({
      name: 'addressWarning',
      title: 'Check the address',
      type: 'string',
      readOnly: true,
      description:
        'Set when the postcode doesn\u2019t fit the country chosen at checkout. Confirm the address with the customer (in Stripe) before posting.',
      hidden: ({ document }) => !document?.addressWarning,
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
            defineField({ name: 'madeToOrder', title: 'Made to order', type: 'boolean' }),
            defineField({
              name: 'customSize',
              title: 'Custom size (made to order)',
              type: 'string',
            }),
            defineField({
              name: 'engraving',
              title: 'Engraving (made to order)',
              type: 'string',
              readOnly: true,
            }),
            defineField({
              name: 'engravingGBP',
              title: 'Engraving price (pence, per piece)',
              type: 'number',
              readOnly: true,
            }),
            defineField({
              name: 'largeSizeGBP',
              title: 'Larger size surcharge (pence, per piece)',
              type: 'number',
              readOnly: true,
            }),
            defineField({
              name: 'notes',
              title: 'Customer notes (agreed changes)',
              type: 'text',
              rows: 3,
              readOnly: true,
            }),
          ],
          preview: {
            select: {
              title: 'sku',
              qty: 'quantity',
              size: 'customSize',
              engraving: 'engraving',
              large: 'largeSizeGBP',
              notes: 'notes',
            },
            prepare: ({ title, qty, size, engraving, large, notes }) => ({
              title,
              subtitle: [
                `qty: ${qty}`,
                size && `made to order, size ${size}`,
                large && 'larger size',
                engraving && `engraved “${engraving}”`,
                notes && 'has notes',
              ]
                .filter(Boolean)
                .join(' / '),
            }),
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
        defineField({
          name: 'carrier',
          title: 'Carrier',
          type: 'string',
          // A known courier means the shipping email can link to its tracking page.
          options: { list: CARRIERS },
        }),
        defineField({ name: 'trackingNumber', title: 'Tracking Number', type: 'string' }),
        defineField({
          name: 'targetShipDate',
          title: 'Target ship date',
          type: 'date',
          description: `Internal. Leave empty to aim for ${MAKING_TARGET_WEEKS} weeks after payment (made-to-order pieces); set a date to override it, e.g. one agreed with the customer.`,
        }),
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
    select: {
      title: 'orderNumber',
      status: 'status',
      createdAt: 'createdAt',
      addressWarning: 'addressWarning',
    },
    prepare({ title, status, createdAt, addressWarning }) {
      const date = createdAt ? new Date(createdAt).toLocaleDateString('en-GB') : null;
      return {
        title: title || 'Order',
        subtitle: [addressWarning ? 'check address' : null, status, date]
          .filter(Boolean)
          .join(' / '),
      };
    },
  },
});
