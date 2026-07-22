import { defineArrayMember, defineField, defineType } from 'sanity';
import { pageBuilderField } from '../objects/blocks';

export const collection = defineType({
  name: 'collection',
  title: 'Collection / Drop',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'dropNumber',
      title: 'Drop Number',
      type: 'string',
    }),
    defineField({
      name: 'releaseDate',
      title: 'Release Date',
      type: 'datetime',
    }),
    defineField({
      name: 'narrative',
      title: 'Narrative',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt Text', type: 'string' }),
      ],
    }),
    // Compose the drop's landing page from stackable image/text blocks.
    pageBuilderField('content', 'Drop page content'),
  ],
});
