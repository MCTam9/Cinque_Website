import { defineArrayMember, defineField, defineType } from 'sanity';
import { crop2x3 } from '../imageCrop';

/**
 * The Home page — a singleton (only one exists; edited in place, never created
 * or deleted). Staff edit the tagline and, for each section (Shop / Lookbook /
 * Exhibition / Studio), upload one or more images.
 *
 * Rendering adapts to the viewport and to how many images a section has:
 *   • mobile → a slow auto-scrolling strip showing ~2.5 images at a time.
 *   • desktop, 1–5 images → a grid whose column count follows the count.
 *   • desktop, 6+ images → the same auto-scrolling strip.
 * A section left empty falls back to the built-in Figma strip, so the page
 * always renders.
 */
const sectionImages = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    description:
      'On phones these auto-scroll sideways, about 2.5 images at a time. On desktop 1–5 images become a grid (columns follow the count); 6+ auto-scroll. Images are cropped to 2:3.',
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
    sectionImages('lookbookImages', 'LOOKBOOK images'),
    sectionImages('exhibitionImages', 'EXHIBITION images'),
    sectionImages('studioImages', 'STUDIO images'),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
