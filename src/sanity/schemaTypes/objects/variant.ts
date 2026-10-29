import { defineField, defineType } from 'sanity';
import { LARGE_SIZE_LETTERS, RING_SIZE_ROWS, offersLargeSizes } from '@/lib/shop/ringSizes';

/** The variant being edited, as the larger-size fields' `hidden` checks read it. */
type Parent = { metalType?: string; madeToOrder?: boolean; largeSizesUpTo?: string } | undefined;

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
        'Material: S Sterling Silver, 9G / 9R / 9W 9ct Yellow / Rose / White Gold, ' +
        '14G / 14R / 14W 14ct Yellow / Rose / White Gold, ' +
        '18G / 18R / 18W 18ct Yellow / Rose / White Gold, P Platinum, V Gold Vermeil, ' +
        'B Brass, C custom / multiple materials. Append -Size only if the variant has one ' +
        '(CIN001-R02-S-M), or -C for a made-to-order custom size (CIN001-R02-S-C). Every SKU must be unique across the whole catalog.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'metalType',
      title: 'Metal Type',
      type: 'string',
      options: {
        list: [
          // 9ct_gold / 14ct_gold / 18ct_gold are the yellow ones (named before rose and white).
          { title: '9ct Yellow Gold', value: '9ct_gold' },
          { title: '9ct Rose Gold', value: '9ct_rose_gold' },
          { title: '9ct White Gold', value: '9ct_white_gold' },
          { title: '14ct Yellow Gold', value: '14ct_gold' },
          { title: '14ct Rose Gold', value: '14ct_rose_gold' },
          { title: '14ct White Gold', value: '14ct_white_gold' },
          { title: '18ct Yellow Gold', value: '18ct_gold' },
          { title: '18ct Rose Gold', value: '18ct_rose_gold' },
          { title: '18ct White Gold', value: '18ct_white_gold' },
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
        'and the site shows an 8–12 week lead time. Leave Size blank — the option shows as "Made to Order".',
    }),
    defineField({
      name: 'largeSizesUpTo',
      title: 'Larger sizes up to',
      type: 'string',
      description:
        'Made-to-order gold rings only. Standard sizes are UK G–T. Pick a size here to also sell UK U up to it, at the surcharge below. Leave empty for G–T only.',
      options: {
        list: LARGE_SIZE_LETTERS.map((uk) => {
          const row = RING_SIZE_ROWS.find((r) => r.uk === uk)!;
          return { title: `UK ${uk} (US ${row.us})`, value: uk };
        }),
      },
      // Not offered on silver, or on a stocked size.
      hidden: ({ document, parent }) =>
        !offersLargeSizes(document?.category as string | undefined, parent as Parent),
    }),
    defineField({
      name: 'largeSizeSurchargeGBP',
      title: 'Larger size surcharge (GBP, in pence)',
      type: 'number',
      description:
        'Added to this variant’s price for UK U and above, e.g. £75.00 → 7500. Leave empty or 0 to sell larger sizes at the normal price.',
      validation: (rule) => rule.min(0).integer(),
      hidden: ({ document, parent }) =>
        !offersLargeSizes(document?.category as string | undefined, parent as Parent) ||
        !(parent as Parent)?.largeSizesUpTo,
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
          .join(' / '),
      };
    },
  },
});
