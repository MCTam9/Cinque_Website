import { defineField, defineType } from 'sanity';
import { pageBuilderField } from '../objects/blocks';

/**
 * A generic, composable page (About, Stockists, Journal entry, etc.).
 * Staff create one, give it a slug, and stack image/text blocks. It renders at
 * /pages/<slug> via the shared <PageBuilder>.
 */
export const page = defineType({
  name: 'page',
  title: 'Page',
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
      name: 'published',
      title: 'Visible on site',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 2,
    }),
    pageBuilderField(),
  ],
  preview: {
    select: { title: 'title', published: 'published' },
    prepare: ({ title, published }) => ({
      title,
      subtitle: published ? 'Live' : 'Hidden',
    }),
  },
});
