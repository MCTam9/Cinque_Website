import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Page-builder content blocks. These let non-technical staff compose a page
 * (a drop, an exhibition, an About page…) by stacking and reordering simple
 * image + text sections — no developer needed. Each block type maps 1:1 to a
 * React component in <PageBuilder>, which you swap for the Figma-exported
 * component of the same name.
 */

const imageWithAlt = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describes the image for accessibility and SEO.',
        validation: (rule) => rule.required(),
      }),
    ],
  });

export const heroBlock = defineType({
  name: 'heroBlock',
  title: 'Hero',
  type: 'object',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'subheading', title: 'Subheading', type: 'text', rows: 2 }),
    imageWithAlt('image', 'Background / hero image'),
    defineField({ name: 'ctaLabel', title: 'Button label', type: 'string' }),
    defineField({ name: 'ctaHref', title: 'Button link', type: 'string' }),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({ title: title || 'Hero', subtitle: 'Hero block', media }),
  },
});

export const imageTextBlock = defineType({
  name: 'imageTextBlock',
  title: 'Image + Text',
  type: 'object',
  fields: [
    imageWithAlt('image', 'Image'),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          { title: 'Image left', value: 'image-left' },
          { title: 'Image right', value: 'image-right' },
        ],
        layout: 'radio',
      },
      initialValue: 'image-left',
    }),
  ],
  preview: {
    select: { media: 'image' },
    prepare: ({ media }) => ({ title: 'Image + Text', media }),
  },
});

export const galleryBlock = defineType({
  name: 'galleryBlock',
  title: 'Gallery',
  type: 'object',
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'number',
      initialValue: 3,
      validation: (rule) => rule.min(1).max(4).integer(),
    }),
  ],
  preview: {
    select: { images: 'images' },
    prepare: ({ images }) => ({
      title: 'Gallery',
      subtitle: `${images?.length ?? 0} image(s)`,
      media: images?.[0],
    }),
  },
});

export const richTextBlock = defineType({
  name: 'richTextBlock',
  title: 'Text',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Text',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Text block' }),
  },
});

/** All block types, for the schema registry. */
export const pageBuilderBlocks = [heroBlock, imageTextBlock, galleryBlock, richTextBlock];

/**
 * Reusable "page builder" array field. Add it to any document that should be
 * composable from blocks (collection, exhibition, page).
 */
export const pageBuilderField = (name = 'content', title = 'Page content') =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      defineArrayMember({ type: 'heroBlock' }),
      defineArrayMember({ type: 'imageTextBlock' }),
      defineArrayMember({ type: 'galleryBlock' }),
      defineArrayMember({ type: 'richTextBlock' }),
    ],
    options: { insertMenu: { views: [{ name: 'grid' }, { name: 'list' }] } },
  });
