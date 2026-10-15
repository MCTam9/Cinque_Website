import { defineField, defineType } from 'sanity';
import { ANNOUNCEMENT_PAGES } from '@/lib/announcements';

/**
 * A short notice shown under the heading of the pages ticked here (e.g. the
 * Christmas cut-off). Publish to put it live; untick "Show on site", or set
 * an end time, to take it down. Several can run at once.
 */
export const announcement = defineType({
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  fields: [
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
      rows: 3,
      description: 'One or two short sentences.',
      validation: (rule) => rule.required().max(300),
    }),
    defineField({
      name: 'pages',
      title: 'Show on',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: [...ANNOUNCEMENT_PAGES], layout: 'grid' },
      validation: (rule) => rule.required().min(1).error('Tick at least one page.'),
    }),
    defineField({
      name: 'show',
      title: 'Show on site',
      type: 'boolean',
      description: 'Untick to hide it without deleting it.',
      initialValue: true,
    }),
    defineField({
      name: 'showFrom',
      title: 'Start showing',
      type: 'datetime',
      description: 'Optional. Leave empty to show as soon as it’s published.',
    }),
    defineField({
      name: 'showUntil',
      title: 'Stop showing',
      type: 'datetime',
      description: 'Optional. It disappears by itself at this time.',
      validation: (rule) =>
        rule.custom((until, context) => {
          const from = (context.document as { showFrom?: string } | undefined)?.showFrom;
          return until && from && Date.parse(until as string) <= Date.parse(from)
            ? 'Must be after the start time.'
            : true;
        }),
    }),
  ],
  preview: {
    select: { message: 'message', pages: 'pages', show: 'show', until: 'showUntil' },
    prepare({ message, pages, show, until }) {
      const titles = ((pages as string[] | undefined) ?? [])
        .map((p) => ANNOUNCEMENT_PAGES.find((x) => x.value === p)?.title.split(' (')[0] ?? p)
        .join(', ');
      const ended = until && Date.parse(until) <= Date.now();
      const state = show === false ? 'Hidden' : ended ? 'Ended' : null;
      return {
        title: message || 'Announcement',
        subtitle: [state, titles].filter(Boolean).join(' / '),
      };
    },
  },
});
