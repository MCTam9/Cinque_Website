import { defineArrayMember, defineField, defineType } from 'sanity';
import { crop2x3 } from '../imageCrop';

/**
 * A Lookbook drop — the editorial imagery + copy shown at /lookbook.
 * Purely editorial (not tied to purchasable products): staff create a drop,
 * give it a number and some images, and it appears in the Lookbook sidebar and
 * on the Home page drop list automatically, ordered by drop number (desc).
 */
export const lookbookDrop = defineType({
  name: 'lookbookDrop',
  title: 'Lookbook Drop',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The drop name, e.g. "Lost Garden".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'dropNumber',
      title: 'Drop Number',
      type: 'string',
      description: 'Two digits, e.g. "04". Drives ordering and the "04/Lost Garden" label.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Used in the URL, e.g. /lookbook?drop=lost-garden. Click Generate.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro copy',
      type: 'array',
      description: 'The paragraphs shown beside the first image.',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      description: 'The first image is featured large; the rest fill the grid below.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: crop2x3 },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Describes the image for accessibility and SEO.',
              validation: (rule) => rule.required(),
            }),
          ],
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  orderings: [
    {
      title: 'Drop number (newest first)',
      name: 'dropNumberDesc',
      by: [{ field: 'dropNumber', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', dropNumber: 'dropNumber', media: 'images.0' },
    prepare: ({ title, dropNumber, media }) => ({
      title: dropNumber ? `${dropNumber}/${title}` : title,
      subtitle: 'Lookbook drop',
      media,
    }),
  },
});
