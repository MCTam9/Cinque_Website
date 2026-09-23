import { defineArrayMember, defineField, defineType } from 'sanity';
import { crop2x3 } from '../imageCrop';
import { syncedOrderInput } from '../../components/SyncedOrderInput';

/**
 * The Home page — a singleton (only one exists; edited in place, never created
 * or deleted). Staff edit the tagline and, for the Shop / Studio sections,
 * upload one or more images.
 *
 * LOOKBOOK and PRESS only set which drops / press entries show and in what
 * order: each card's title and image come from the drop (its Hero Image) or
 * the press entry (its first image) itself.
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

/** A `<name>Order` reference list plus its hidden `<name>Seen` bookkeeping. */
function syncedList(o: {
  name: string;
  title: string;
  description: string;
  type: string;
  order: string;
}) {
  const orderField = `${o.name}Order`;
  const seenField = `${o.name}Seen`;
  return [
    defineField({
      name: orderField,
      title: o.title,
      type: 'array',
      description: o.description,
      of: [defineArrayMember({ type: 'reference', to: [{ type: o.type }] })],
      components: {
        input: syncedOrderInput({ type: o.type, order: o.order, orderField, seenField }),
      },
    }),
    defineField({
      name: seenField,
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      hidden: true,
    }),
  ];
}

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
    // LOOKBOOK and PRESS: order only. Title and image travel with the drop or
    // press entry, so reordering can never caption a picture with another's
    // name. The input keeps each list in step with its documents, and the
    // hidden `…Seen` field beside it records what has already been offered, so
    // an entry staff removed isn't re-added (see SyncedOrderInput).
    ...syncedList({
      name: 'lookbook',
      title: 'LOOKBOOK — drag to reorder',
      description:
        "The drops on the Home page, in this order. Each card's title and image come from the drop's Hero Image in Editorial → Drops. New drops are added here automatically; remove one to hide it.",
      type: 'drop',
      order: 'dropNumber desc',
    }),
    ...syncedList({
      name: 'press',
      title: 'PRESS — drag to reorder',
      description:
        "The press entries on the Home page, in this order. Each card's title and image (its first image) come from the entry in Press. New entries are added here automatically; remove one to hide it.",
      type: 'press',
      order: 'startDate desc',
    }),
    sectionImages('studioImages', 'STUDIO images'),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
