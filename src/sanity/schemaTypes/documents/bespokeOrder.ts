import { defineField, defineType } from 'sanity';
import { SHIP_COUNTRIES } from '@/lib/shop/shipping';

/**
 * A bespoke or customised piece sold through a Stripe Payment Link, made here
 * in the Admin. Publishing it creates the link (src/lib/stripe/bespoke.ts);
 * the customer enters their shipping address and pays on Stripe's page, and
 * the payment then arrives as an ordinary order under To fulfil.
 *
 * The link belongs to the document that made it (`linkFor` is its id), so a
 * Duplicate gets its own link instead of sharing the original's.
 *
 * This dataset is publicly readable: no customer names or emails here.
 */

/** True once this document (not a copy of it) has its Stripe link. */
const hasOwnLink = (document?: Record<string, unknown>) =>
  Boolean(document?.stripePaymentLinkId) &&
  document?.linkFor === String(document?._id ?? '').replace(/^drafts\./, '');

const locked = ({ document }: { document?: Record<string, unknown> }) => hasOwnLink(document);

export const bespokeOrder = defineType({
  name: 'bespokeOrder',
  title: 'Bespoke payment link',
  type: 'document',
  fields: [
    defineField({
      name: 'paymentLinkUrl',
      title: 'Payment link',
      type: 'url',
      readOnly: true,
      description:
        'Copy this and send it to the customer. It appears a few seconds after you publish.',
      hidden: ({ document }) => !hasOwnLink(document),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      readOnly: true,
      options: {
        list: [
          { title: 'Link ready, waiting for payment', value: 'ready' },
          { title: 'Paid', value: 'paid' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
      },
      hidden: ({ document }) => !hasOwnLink(document),
    }),
    defineField({
      name: 'orderNumber',
      title: 'Order',
      type: 'string',
      readOnly: true,
      description: 'Find it under Orders, To fulfil.',
      hidden: ({ document }) => !document?.orderNumber,
    }),
    defineField({
      name: 'title',
      title: 'Piece',
      type: 'string',
      description:
        'Shown to the customer on the payment page and in their emails, e.g. "Bespoke signet ring, 9ct gold". No customer names: Admin records are publicly readable.',
      validation: (rule) => rule.required().max(120),
      readOnly: locked,
    }),
    defineField({
      name: 'description',
      title: 'Details',
      type: 'text',
      rows: 3,
      description:
        'Optional. Shown under the piece on the payment page, e.g. size, engraving, lead time.',
      validation: (rule) => rule.max(500),
      readOnly: locked,
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      description: 'Optional. Shown on the payment page and in the emails.',
      readOnly: locked,
    }),
    defineField({
      name: 'priceGBP',
      title: 'Price (GBP, in pence)',
      type: 'number',
      description: 'Integer, in pence. e.g. £1,250.00 → 125000. Shipping is added on top.',
      validation: (rule) => rule.required().integer().min(100),
      readOnly: locked,
    }),
    defineField({
      name: 'shipTo',
      title: 'Ships to',
      type: 'string',
      description:
        'The customer can only enter an address in this country. Shipping is charged at the usual rate (free from £300).',
      options: { list: SHIP_COUNTRIES.map((c) => ({ title: c.name, value: c.code })) },
      initialValue: 'GB',
      validation: (rule) => rule.required(),
      readOnly: locked,
    }),
    defineField({
      name: 'invoicePdf',
      title: 'Email an invoice (PDF) after payment',
      type: 'boolean',
      description:
        'Stripe charges a small fee for this (about 0.4%). Off: they still get a receipt.',
      initialValue: false,
      readOnly: locked,
    }),
    defineField({
      name: 'cancelled',
      title: 'Cancel this link',
      type: 'boolean',
      description:
        'Switches the link off so it can no longer be paid. To change the price, cancel and create a new one.',
      hidden: ({ document }) => !hasOwnLink(document) || document?.status === 'paid',
    }),
    defineField({
      name: 'paidAt',
      title: 'Paid',
      type: 'datetime',
      readOnly: true,
      hidden: ({ document }) => !document?.paidAt,
    }),
    // Managed by the Stripe sync.
    defineField({ name: 'linkFor', type: 'string', hidden: true, readOnly: true }),
    defineField({ name: 'stripePaymentLinkId', type: 'string', hidden: true, readOnly: true }),
    defineField({ name: 'stripeProductId', type: 'string', hidden: true, readOnly: true }),
    defineField({ name: 'stripePriceId', type: 'string', hidden: true, readOnly: true }),
  ],
  preview: {
    select: {
      title: 'title',
      price: 'priceGBP',
      shipTo: 'shipTo',
      status: 'status',
      media: 'image',
    },
    prepare: ({ title, price, shipTo, status, media }) => ({
      title: title || 'Bespoke piece',
      subtitle: [
        typeof price === 'number' && `£${(price / 100).toLocaleString('en-GB')}`,
        shipTo,
        { ready: 'link ready', paid: 'paid', cancelled: 'cancelled' }[status as string] ??
          'publish to make the link',
      ]
        .filter(Boolean)
        .join(' / '),
      media,
    }),
  },
});
