import { defineArrayMember, defineField, defineType } from 'sanity';
import { cropProduct } from '../imageCrop';

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'variants', title: 'Variants & Pricing' },
    { name: 'production', title: 'Production (Internal)' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'collection',
      title: 'Collection / Drop',
      type: 'reference',
      to: [{ type: 'collection' }],
      group: 'content',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'content',
      description: 'Drives the Shop page filter.',
      options: {
        list: [
          { title: 'Rings', value: 'rings' },
          { title: 'Earrings', value: 'earrings' },
          { title: 'Necklaces', value: 'necklaces' },
          { title: 'Objects', value: 'objects' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'string',
      group: 'content',
      description: 'Edition label shown on the card / product page (e.g. "Edition of 5", "Open Edition").',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Active', value: 'active' },
          { title: 'Sold Out', value: 'sold_out' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: (rule) =>
        rule.required().custom((status, context) => {
          // Guardrail: a product can't go live until it's actually sellable.
          if (status !== 'active') return true;
          const doc = context.document as
            | { images?: unknown[]; variants?: { priceGBP?: number }[] }
            | undefined;
          if (!doc?.images || doc.images.length === 0) {
            return 'Add at least one image before setting the product to Active.';
          }
          if (!doc.variants || doc.variants.length === 0) {
            return 'Add at least one variant before setting the product to Active.';
          }
          const unpriced = doc.variants.filter(
            (v) => typeof v.priceGBP !== 'number' || v.priceGBP <= 0
          );
          if (unpriced.length > 0) {
            return 'Every variant needs a price above 0 before the product goes Active.';
          }
          return true;
        }),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: cropProduct },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'careInstructions',
      title: 'Care Instructions',
      type: 'text',
      group: 'content',
      rows: 3,
    }),
    defineField({
      name: 'variants',
      title: 'Variants (SKUs)',
      type: 'array',
      group: 'variants',
      of: [defineArrayMember({ type: 'variant' })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'productionNotes',
      title: 'Production Notes',
      type: 'productionNotes',
      group: 'production',
    }),
  ],
  preview: {
    select: { title: 'title', status: 'status', media: 'images.0' },
    prepare({ title, status, media }) {
      return { title, subtitle: status, media };
    },
  },
});
