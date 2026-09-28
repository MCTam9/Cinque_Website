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
      description:
        'CIN{Drop}-{Type}{Number}[C]-{Material}[-{Size}], e.g. CIN001-P01C-S ' +
        '(Drop 001, Pendant no. 01 with Chain, Sterling Silver). ' +
        'Drop: CIN + the drop number in three digits (CIN000 for one-offs not tied to a drop). ' +
        'Type: P Pendant, N Necklace, R Ring, E Earring, B Bracelet, O Object; add C for ' +
        'a piece sold with a chain (P01C). Number: two digits, unique per type within the drop. ' +
        'Material: S Sterling Silver, G9 9ct Gold, G18 18ct Gold, P Platinum, V Gold Vermeil, ' +
        'B Brass, M custom / multiple materials. Append -Size only if the variant has one ' +
        '(CIN001-R02-S-M). Every SKU must be unique across the whole catalog.',
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
          { title: 'Other / multiple materials…', value: 'custom' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'customMaterial',
      title: 'Custom Material',
      type: 'string',
      description:
        'Shown as the Material on the card and product page, e.g. "Sterling Silver & 18ct Gold" ' +
        'or "Silver, Pearl". Use it for pieces that are more than one material.',
      hidden: ({ parent }) => parent?.metalType !== 'custom',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { metalType?: string } | undefined;
          if (parent?.metalType === 'custom' && !value?.trim()) {
            return 'Type the material(s), or pick a Metal Type from the list.';
          }
          return true;
        }),
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
    defineField({
      name: 'madeToOrder',
      title: 'Made to order',
      type: 'boolean',
      initialValue: false,
      description:
        'Sold regardless of stock, which is not tracked. The customer enters their own size, ' +
        'and the site shows an 8–12 week lead time. Leave Size blank — the option shows as "Custom".',
    }),
  ],
  preview: {
    select: {
      sku: 'sku',
      metal: 'metalType',
      customMaterial: 'customMaterial',
      size: 'size',
      stock: 'stockQuantity',
      madeToOrder: 'madeToOrder',
    },
    prepare({ sku, metal, customMaterial, size, stock, madeToOrder }) {
      return {
        title: sku || 'Variant',
        subtitle: [metal === 'custom' ? customMaterial : metal, size, madeToOrder ? 'made to order' : `stock: ${stock ?? 0}`]
          .filter(Boolean)
          .join(' · '),
      };
    },
  },
});
