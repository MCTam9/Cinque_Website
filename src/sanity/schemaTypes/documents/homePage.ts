import { defineArrayMember, defineField, defineType } from 'sanity';
import { crop2x3 } from '../imageCrop';
import { LookbookOrderInput } from '../../components/LookbookOrderInput';

/**
 * The Home page — a singleton (only one exists; edited in place, never created
 * or deleted). Staff edit the tagline and, for the Shop / Studio sections,
 * upload one or more images.
 *
 * LOOKBOOK only sets the order of the drops: each card's title and image come
 * from the drop itself (Editorial → Drops, its Hero Image). PRESS has no field
 * here at all: it is built from the Press entries, one card per entry.
 *
 * Each section is one row of images, sized to how many it has:
 *   • mobile → the first 4, up to 4 columns; captions hidden.
 *   • desktop → the first 5, up to 5 columns, each captioned.
 * Anything beyond those counts never renders. A section left empty simply shows
 * its heading — no image is ever substituted in.
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
    // Order only. Title and image travel with the drop, so reordering can never
    // caption a picture with another drop's name. The input keeps the list in
    // step with the published drops (see LookbookOrderInput).
    defineField({
      name: 'lookbookOrder',
      title: 'LOOKBOOK — drag to reorder',
      type: 'array',
      description:
        "The drops on the Home page, in this order. Each card's title and image come from the drop's Hero Image in Editorial → Drops. New drops are added here automatically; remove one to hide it.",
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'drop' }] })],
      components: { input: LookbookOrderInput },
    }),
    // Every drop the list above has already offered, so a drop staff removed
    // isn't re-added next time. Maintained by LookbookOrderInput; never edited.
    defineField({
      name: 'lookbookSeen',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      hidden: true,
    }),
    // No PRESS field: that section builds itself from the press entries, each
    // card showing that entry's own first image. Add imagery to the press entry
    // rather than here. See `pressCards` in the Home page.
    sectionImages('studioImages', 'STUDIO images'),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
