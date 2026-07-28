import { defineArrayMember, defineField, defineType } from 'sanity';
import { pageBuilderField } from '../objects/blocks';
import { crop2x3 } from '../imageCrop';

// Merges what were once two separate types — Exhibition (gallery shows) and
// the never-shipped Press Item (press-clipping mentions) — into one. Venue
// and Publication are both optional so an entry can be either kind, or both.
export const press = defineType({
  name: 'press',
  title: 'Press',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      description: 'A second line under the title on the Press page.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'venue', title: 'Venue', type: 'string' }),
    defineField({ name: 'publication', title: 'Publication', type: 'string' }),
    defineField({ name: 'location', title: 'Location', type: 'string' }),
    defineField({
      name: 'startDate',
      title: 'Date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'endDate', title: 'End Date', type: 'date' }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: crop2x3 },
          fields: [defineField({ name: 'alt', title: 'Alt Text', type: 'string' })],
        }),
      ],
    }),
    defineField({ name: 'externalUrl', title: 'External URL', type: 'url' }),
    // Optional richer page composed from stackable image/text blocks.
    pageBuilderField('content', 'Press page content'),
  ],
  orderings: [
    {
      title: 'Start date (newest)',
      name: 'startDesc',
      by: [{ field: 'startDate', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', venue: 'venue', publication: 'publication', media: 'images.0' },
    prepare: ({ title, venue, publication, media }) => ({
      title,
      subtitle: venue || publication,
      media,
    }),
  },
});
