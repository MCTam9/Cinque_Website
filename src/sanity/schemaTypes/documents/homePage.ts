import { defineArrayMember, defineField, defineType } from 'sanity';
import { crop2x3 } from '../imageCrop';

/**
 * The Home page — a singleton (only one exists; edited in place, never created
 * or deleted). Staff edit the tagline and, for each section (Shop / Lookbook /
 * Press / Studio), upload one or more images.
 *
 * Each section is one row of images, sized to how many it has:
 *   • mobile → the first 4, up to 4 columns; captions hidden.
 *   • desktop → the first 5, up to 5 columns, each captioned.
 * Anything beyond those counts never renders. A section left empty falls back
 * to the built-in Figma strip, so the page always renders.
 */
const sectionImages = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    description:
      'One row on the Home page: the first 4 show on phones, the first 5 on desktop — any beyond that are not shown. Images are cropped to 2:3.',
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
          }),
        ],
      }),
    ],
  });

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'text',
      rows: 3,
      description: 'The intro lines beside the logo. Each line break shows as a new line.',
    }),
    sectionImages('shopImages', 'SHOP images'),
    // Order matters here: the first LOOKBOOK image is captioned with the newest
    // drop, the second with the one before it, and so on (see `lookbookCards`
    // in the Home page). Reordering these re-pairs the titles.
    sectionImages(
      'lookbookImages',
      'LOOKBOOK images (one per drop, newest first)'
    ),
    sectionImages('pressImages', 'PRESS images'),
    sectionImages('studioImages', 'STUDIO images'),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
