import { defineArrayMember, defineField, defineType } from 'sanity';

export const pressItem = defineType({
  name: 'pressItem',
  title: 'Press Item',
  type: 'document',
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'publication', title: 'Publication', type: 'string' }),
    defineField({ name: 'publishDate', title: 'Publish Date', type: 'date' }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 }),
    defineField({ name: 'externalUrl', title: 'External URL', type: 'url' }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt Text', type: 'string' })],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
    }),
  ],
  orderings: [
    {
      title: 'Publish date (newest)',
      name: 'publishDesc',
      by: [{ field: 'publishDate', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'headline', pub: 'publication', media: 'coverImage' },
    prepare: ({ title, pub, media }) => ({ title, subtitle: pub, media }),
  },
});
