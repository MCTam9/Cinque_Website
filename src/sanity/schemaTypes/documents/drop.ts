import { defineArrayMember, defineField, defineType } from 'sanity';
import { pageBuilderField } from '../objects/blocks';
import { crop2x3 } from '../imageCrop';

// One drop, entered once: powers the Shop catalog (product cards link back
// here via Product → Drop) and the Lookbook editorial page. Was previously
// two separate types — Collection/Drop and Lookbook Drop — that had to be
// entered twice and kept in sync by hand.
export const drop = defineType({
  name: 'drop',
  title: 'Drop',
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Used in the URL, e.g. /lookbook?drop=lost-garden. Click Generate.',
      options: { source: 'title', maxLength: 96 },
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
      name: 'releaseDate',
      title: 'Release Date',
      type: 'datetime',
    }),
    defineField({
      name: 'intro',
      title: 'Intro copy',
      type: 'array',
      description: 'The paragraphs shown beside the first image on the Lookbook page.',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      description: 'Used for the drop’s card on the Shop page.',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt Text', type: 'string' })],
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      description: 'The Lookbook gallery for this drop. The first image is featured large.',
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
    // Optional richer landing page at /collections/[slug], composed from
    // stackable image/text blocks.
    pageBuilderField('content', 'Drop page content'),
  ],
  orderings: [
    {
      title: 'Drop number (newest first)',
      name: 'dropNumberDesc',
      by: [{ field: 'dropNumber', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', dropNumber: 'dropNumber', media: 'images.0', hero: 'heroImage' },
    prepare: ({ title, dropNumber, media, hero }) => ({
      title: dropNumber ? `${dropNumber}/${title}` : title,
      subtitle: 'Drop',
      media: media || hero,
    }),
  },
});
