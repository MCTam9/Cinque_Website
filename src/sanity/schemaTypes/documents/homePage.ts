import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * The Home page — a singleton (only one exists; edited in place, never created
 * or deleted). Staff edit the tagline and, for each section (Shop / Lookbook /
 * Exhibition / Studio), upload one or more images.
 *
 * Rendering adapts to how many images a section has:
 *   • 1–5 images → a grid whose column count follows the image count.
 *   • 6+ images → a slow auto-scrolling strip the visitor can also scroll.
 * A section left empty falls back to the built-in Figma strip, so the page
 * always renders.
 */
const sectionImages = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    description:
      '1–5 images show as a grid (columns follow the count); 6+ becomes a slow auto-scrolling strip.',
    of: [
      defineArrayMember({
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
    sectionImages('lookbookImages', 'LOOKBOOK images'),
    sectionImages('exhibitionImages', 'EXHIBITION images'),
    sectionImages('studioImages', 'STUDIO images'),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
