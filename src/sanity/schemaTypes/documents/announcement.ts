import { defineArrayMember, defineField, defineType } from 'sanity';
import { ANNOUNCEMENT_PAGES, messageText } from '@/lib/announcements';

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
      type: 'array',
      description:
        'One or two short sentences. Select text for bold, italic, underline or a link.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
            ],
            annotations: [
              {
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'Link to',
                    type: 'url',
                    description: 'A page on the site (/shop/rings) or a full web address.',
                    validation: (rule) =>
                      rule.required().uri({ allowRelative: true, scheme: ['http', 'https', 'mailto'] }),
                  }),
                ],
              },
            ],
          },
        }),
      ],
      validation: (rule) =>
        rule.required().custom((value) =>
          messageText(value as never).length > 300 ? 'Keep it under 300 characters.' : true
        ),
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
        title: messageText(message) || 'Announcement',
        subtitle: [state, titles].filter(Boolean).join(' / '),
      };
    },
  },
});
