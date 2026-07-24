import { defineField, defineType } from 'sanity';

/**
 * The Home page — a singleton (only one exists; edited in place, never created
 * or deleted). Staff can change the tagline and swap the four section strip
 * images (Shop / Lookbook / Exhibition / Studio). The Lookbook drop list under
 * the LOOKBOOK strip is generated automatically from the Lookbook Drops.
 *
 * Any image left empty falls back to the built-in Figma export, so the page
 * always renders.
 */
const stripImage = (name: string, title: string) =>
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
    stripImage('shopImage', 'SHOP strip image'),
    stripImage('lookbookImage', 'LOOKBOOK strip image'),
    stripImage('exhibitionImage', 'EXHIBITION strip image'),
    stripImage('studioImage', 'STUDIO strip image'),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
