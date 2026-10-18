import { defineField, defineType } from 'sanity';
import { SHIP_COUNTRIES } from '@/lib/shop/shipping';
import { ANY_COUNTRY } from '@/lib/shop/bespoke';
import { RING_SIZE_ROWS } from '@/lib/shop/ringSizes';
import { ENGRAVING_MAX, ENGRAVING_PATTERN } from '@/lib/shop/madeToOrder';

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
 * Entries get dotted ids (BESPOKE_ID_PREFIX), so they're served only with a
 * token; the engraving leans on that, as it does on orders (see order.ts).
 *
 * Size, engraving and notes land on the paid order's line as `customSize`,
 * `engraving` and `notes` (the webhook), the same fields a shop order uses.
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
  fieldsets: [
    { name: 'link', title: 'Payment link' },
    { name: 'piece', title: 'The piece' },
    { name: 'price', title: 'Price & delivery' },
    { name: 'cancel', title: 'Cancel' },
  ],
  fields: [
    defineField({
      name: 'paymentLinkUrl',
      title: 'Payment link',
      type: 'url',
      fieldset: 'link',
      readOnly: true,
      description:
        'Copy this and send it to the customer. It appears a few seconds after you publish.',
      hidden: ({ document }) => !hasOwnLink(document),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      fieldset: 'link',
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
      fieldset: 'link',
      readOnly: true,
      description: 'Find it under Orders, To fulfil.',
      hidden: ({ document }) => !document?.orderNumber,
    }),
    defineField({
      name: 'title',
      title: 'Piece',
      type: 'string',
      fieldset: 'piece',
      description:
        'Shown to the customer on the payment page and in their emails, e.g. "Bespoke signet ring, 9ct gold". No customer names: Admin records are publicly readable.',
      validation: (rule) => rule.required().max(120),
      readOnly: locked,
    }),
    defineField({
      name: 'size',
      title: 'Ring size',
      type: 'string',
      fieldset: 'piece',
      description:
        'Optional. Shown to the customer on the payment page as "Size UK N". Leave empty for pieces that aren’t rings; half sizes or anything else go in Details.',
      options: {
        list: RING_SIZE_ROWS.map((r) => ({ title: `UK ${r.uk} (US ${r.us})`, value: `UK ${r.uk}` })),
      },
      readOnly: locked,
    }),
    defineField({
      name: 'engraving',
      title: 'Engraving',
      type: 'string',
      fieldset: 'piece',
      description: `Optional, up to ${ENGRAVING_MAX} characters. Shown to the customer on the payment page so they can check it. Kept private like an order's engraving; the text to engrave only, nothing else about the customer.`,
      // The shop's limits: the same workshop engraves both.
      validation: (rule) =>
        rule
          .max(ENGRAVING_MAX)
          .custom(
            (v) =>
              !v ||
              ENGRAVING_PATTERN.test(v) ||
              'Only letters, numbers, spaces and & . , \' - : / + ♥ can be engraved.',
          ),
      readOnly: locked,
    }),
    defineField({
      name: 'description',
      title: 'Details',
      type: 'text',
      fieldset: 'piece',
      rows: 3,
      description:
        'Optional. Shown under the piece on the payment page, e.g. metal, stone, lead time. No customer names.',
      validation: (rule) => rule.max(500),
      readOnly: locked,
    }),
    defineField({
      name: 'notes',
      title: 'Notes for the workshop',
      type: 'text',
      rows: 3,
      fieldset: 'piece',
      description:
        'Internal: never shown to the customer and never sent to Stripe, so it stays editable after the link is made. Copied onto the order when it’s paid, e.g. making instructions. No customer contact details.',
      validation: (rule) => rule.max(1000),
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      fieldset: 'piece',
      description: 'Optional. Shown on the payment page and in the emails.',
      readOnly: locked,
    }),
    defineField({
      name: 'priceGBP',
      title: 'Price (GBP, in pence)',
      type: 'number',
      fieldset: 'price',
      description: 'Integer, in pence. e.g. £1,250.00 → 125000. Shipping is added on top.',
      validation: (rule) => rule.required().integer().min(100),
      readOnly: locked,
    }),
    defineField({
      name: 'shipTo',
      title: 'Ships to',
      type: 'string',
      fieldset: 'price',
      description:
        'Any country: the customer enters any address in a country we ship to (UK, US, Canada, Australia, Japan), e.g. to send it to a friend. Shipping is free from £300; under that they choose UK (£4.99) or international (£9.99) delivery. Pick one country to allow only addresses there.',
      options: {
        list: [
          { title: 'Any country we ship to', value: ANY_COUNTRY },
          ...SHIP_COUNTRIES.map((c) => ({ title: c.name, value: c.code })),
        ],
      },
      initialValue: ANY_COUNTRY,
      validation: (rule) => rule.required(),
      readOnly: locked,
    }),
    defineField({
      name: 'invoicePdf',
      title: 'Email an invoice (PDF) after payment',
      type: 'boolean',
      fieldset: 'price',
      description:
        'Stripe charges a small fee for this (about 0.4%). Off: they still get a receipt.',
      initialValue: false,
      readOnly: locked,
    }),
    defineField({
      name: 'cancelled',
      title: 'Cancel this link',
      type: 'boolean',
      fieldset: 'cancel',
      description:
        'Switches the link off so it can no longer be paid. To change the price, cancel and create a new one.',
      hidden: ({ document }) => !hasOwnLink(document) || document?.status === 'paid',
    }),
    defineField({
      name: 'paidAt',
      title: 'Paid',
      type: 'datetime',
      fieldset: 'cancel',
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
