import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Orders are created/finalized by the Stripe webhook, NOT by hand.
 * This document powers the dashboard's orders & customer-query view and is
 * the read-source for shipping (ShipStation) and transactional email.
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
    }),
    defineField({
      name: 'stripePaymentIntentId',
      title: 'Stripe PaymentIntent ID',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'customer',
      title: 'Customer',
      type: 'object',
      fields: [
        defineField({ name: 'email', title: 'Email', type: 'string' }),
        defineField({ name: 'name', title: 'Name', type: 'string' }),
        defineField({ name: 'phone', title: 'Phone', type: 'string' }),
        defineField({
          name: 'shippingAddress',
          title: 'Shipping Address',
          type: 'object',
          fields: [
            defineField({ name: 'line1', title: 'Line 1', type: 'string' }),
            defineField({ name: 'line2', title: 'Line 2', type: 'string' }),
            defineField({ name: 'city', title: 'City', type: 'string' }),
            defineField({ name: 'postalCode', title: 'Postal Code', type: 'string' }),
            defineField({ name: 'country', title: 'Country', type: 'string' }),
          ],
        }),
      ],
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
    select: { title: 'orderNumber', status: 'status', email: 'customer.email' },
    prepare({ title, status, email }) {
      return { title: title || 'Order', subtitle: [status, email].filter(Boolean).join(' · ') };
    },
  },
});
