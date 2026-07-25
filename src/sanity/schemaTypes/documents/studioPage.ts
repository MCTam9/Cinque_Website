import { defineArrayMember, defineField, defineType } from 'sanity';
import { crop5x7, crop16x9 } from '../imageCrop';

/**
 * The Studio page (/studio) — a singleton, like Home: only one exists, edited
 * in place, never created or deleted.
 *
 * Every field is optional. Left blank, the page falls back to the built-in copy
 * and Figma imagery it shipped with, so /studio always renders in full — the
 * same degrade-gracefully rule the rest of the storefront follows.
 */
export const studioPage = defineType({
  name: 'studioPage',
  title: 'Studio Page',
  type: 'document',
  groups: [
    { name: 'about', title: 'About', default: true },
    { name: 'contact', title: 'Contact' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ── About ──
    defineField({
      name: 'label',
      title: 'Opening line',
      type: 'string',
      group: 'about',
      description: 'The grey line above the About copy, e.g. "[Cinque: five]".',
    }),
    defineField({
      name: 'about',
      title: 'About copy',
      type: 'array',
      group: 'about',
      of: [defineArrayMember({ type: 'block' })],
      description:
        'The studio story. Each paragraph is spaced automatically; links open in a new tab.',
    }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram link',
      type: 'url',
      group: 'about',
      description:
        'Where "Follow us on Instagram" points. Leave blank to use the studio account.',
    }),
    defineField({
      name: 'portrait',
      title: 'Portrait image',
      type: 'image',
      group: 'about',
      options: { hotspot: crop5x7 },
      description: 'Beside the About copy, cropped to a 5:7 portrait.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the image for accessibility and SEO.',
        }),
      ],
    }),
    defineField({
      name: 'bandImage',
      title: 'Wide band image',
      type: 'image',
      group: 'about',
      options: { hotspot: crop16x9 },
      description:
        'The full-width 16:9 band below About. Desktop only — phones skip it.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the image for accessibility and SEO.',
        }),
      ],
    }),

    // ── Contact ──
    defineField({
      name: 'contactIntro',
      title: 'Contact intro',
      type: 'text',
      rows: 2,
      group: 'contact',
      description: 'The line above the email address, beside the contact form.',
    }),
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      group: 'contact',
      description: 'Shown as a mailto link. This does not change where the form sends.',
    }),
    defineField({
      name: 'commissionNote',
      title: 'Commissions note',
      type: 'text',
      rows: 2,
      group: 'contact',
      description: 'Intro to the commissions checklist. Each line break shows as a new line.',
    }),
    defineField({
      name: 'commissionChecklist',
      title: 'Commissions checklist',
      type: 'array',
      group: 'contact',
      of: [defineArrayMember({ type: 'string' })],
      description: 'One line per item, e.g. "Desired timeline".',
    }),
    defineField({
      name: 'responseTime',
      title: 'Response time',
      type: 'string',
      group: 'contact',
      description: 'e.g. "We aim to respond within 2–3 working days."',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 3,
      group: 'contact',
      description: 'Each line break shows as a new line.',
    }),

    // ── SEO ──
    defineField({
      name: 'seoDescription',
      title: 'Search description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The summary search engines show for /studio. Around 155 characters.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Studio Page' }),
  },
});
