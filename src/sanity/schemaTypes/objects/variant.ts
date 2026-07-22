import { defineField, defineType } from 'sanity';

/**
 * A purchasable SKU. A product has one or more variants; inventory,
 * price and the Stripe Price mapping all live at the variant level.
 *
 * IMPORTANT: `priceGBP` is stored in MINOR units (pence) as an integer to
 * avoid floating-point money errors. It is a fallback/reference — checkout
 * prefers `stripePriceId` when present for price integrity.
 */
export const variant = defineType({
  name: 'variant',
  title: 'Variant (SKU)',
  type: 'object',
  fields: [
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'metalType',
      title: 'Metal Type',
      type: 'string',
      options: {
        list: [
          { title: '9ct Gold', value: '9ct_gold' },
          { title: '18ct Gold', value: '18ct_gold' },
          { title: 'Sterling Silver', value: 'sterling_silver' },
          { title: 'Platinum', value: 'platinum' },
          { title: 'Gold Vermeil', value: 'gold_vermeil' },
          { title: 'Brass', value: 'brass' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'metalFinish',
      title: 'Metal Finish',
      type: 'string',
      options: {
        list: ['polished', 'matte', 'brushed', 'oxidised', 'hammered'],
      },
    }),
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      description: 'Ring size, chain length, etc. Leave blank if not applicable.',
    }),
    defineField({
      name: 'stone',
      title: 'Stone',
      type: 'stoneSpec',
    }),
    defineField({
      name: 'priceGBP',
      title: 'Price (GBP, in pence)',
      type: 'number',
      description: 'Integer, in pence. e.g. £120.00 → 12000.',
      validation: (rule) => rule.required().min(0).integer(),
    }),
    defineField({
      name: 'stripeProductId',
      title: 'Stripe Product ID',
      type: 'string',
      readOnly: true,
      description: 'Managed automatically by the Stripe sync. Do not edit.',
    }),
    defineField({
      name: 'stripePriceId',
      title: 'Stripe Price ID',
      type: 'string',
      readOnly: true,
      description:
        'Managed automatically by the Stripe sync (price_...). Source of truth at checkout.',
    }),
    defineField({
      name: 'weightGrams',
      title: 'Weight (g)',
      type: 'number',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'stockQuantity',
      title: 'Stock Quantity',
      type: 'number',
      initialValue: 0,
      validation: (rule) => rule.required().min(0).integer(),
    }),
    defineField({
      name: 'lowStockThreshold',
      title: 'Low Stock Threshold',
      type: 'number',
      initialValue: 2,
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'allowBackorder',
      title: 'Allow Backorder',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { sku: 'sku', metal: 'metalType', size: 'size', stock: 'stockQuantity' },
    prepare({ sku, metal, size, stock }) {
      return {
        title: sku || 'Variant',
        subtitle: [metal, size, `stock: ${stock ?? 0}`].filter(Boolean).join(' · '),
      };
    },
  },
});
