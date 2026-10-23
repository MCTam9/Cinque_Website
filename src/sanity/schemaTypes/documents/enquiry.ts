import { defineField, defineType } from 'sanity';

/**
 * Customer enquiries the inbox agent is keeping track of, so it can draft a
 * follow-up when someone goes quiet. Written by /api/agent/* only; read-only
 * here, and managed from the Orders table's Enquiries tab.
 *
 * NO CUSTOMER DETAILS: the dataset is publicly readable. The conversation
 * itself stays in the mailbox; this holds only dates, a status and a topic,
 * under a private dotted id (`enquiry.<hash of the thread>`), token-only like
 * orders. `replyRef` is the Message-ID of the studio's own latest reply, which
 * is how the agent finds the thread again.
 */

export const ENQUIRY_STATUSES = [
  { title: 'Open (customer wrote last)', value: 'open' },
  { title: 'Waiting for the customer', value: 'awaitingCustomer' },
  { title: 'Ordered', value: 'ordered' },
  { title: 'Closed', value: 'closed' },
  { title: 'Not an enquiry', value: 'ignored' },
];

export const ENQUIRY_TOPICS = [
  { title: 'Made to order', value: 'madeToOrder' },
  { title: 'Bespoke', value: 'bespoke' },
  { title: 'Sizing', value: 'sizing' },
  { title: 'Shipping', value: 'shipping' },
  { title: 'Existing order', value: 'orderIssue' },
  { title: 'Other', value: 'other' },
];

export const FOLLOW_UP_REASONS = [
  { title: 'No reply yet', value: 'noReply' },
  { title: 'Christmas cut-off', value: 'christmasCutoff' },
  { title: 'Customer asked to be contacted later', value: 'customerAskedLater' },
  { title: 'Other', value: 'other' },
];

export const enquiry = defineType({
  name: 'enquiry',
  title: 'Enquiry',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({
      name: 'status',
      type: 'string',
      options: { list: ENQUIRY_STATUSES },
    }),
    defineField({ name: 'topic', type: 'string', options: { list: ENQUIRY_TOPICS } }),
    defineField({ name: 'source', type: 'string', initialValue: 'email' }),
    defineField({ name: 'firstAt', title: 'First message', type: 'datetime' }),
    defineField({ name: 'lastCustomerAt', title: 'Customer last wrote', type: 'datetime' }),
    defineField({ name: 'lastReplyAt', title: 'We last replied', type: 'datetime' }),
    defineField({ name: 'replyRef', type: 'string', hidden: true }),
    defineField({ name: 'followUpOn', title: 'Follow up on', type: 'date' }),
    defineField({
      name: 'followUpReason',
      type: 'string',
      options: { list: FOLLOW_UP_REASONS },
    }),
    defineField({
      name: 'note',
      type: 'string',
      description: 'A few words for the studio. Never names or contact details.',
    }),
    defineField({ name: 'followUps', title: 'Follow-ups drafted', type: 'number' }),
    defineField({ name: 'followUpDraftedAt', type: 'datetime', hidden: true }),
    defineField({ name: 'festiveSent', type: 'boolean', hidden: true }),
    defineField({
      name: 'handled',
      type: 'array',
      of: [{ type: 'string' }],
      hidden: true,
      description: 'Hashes of messages already drafted for or skipped.',
    }),
  ],
  orderings: [
    { title: 'Latest first', name: 'latest', by: [{ field: 'lastCustomerAt', direction: 'desc' }] },
  ],
  preview: {
    select: { topic: 'topic', status: 'status', at: 'lastCustomerAt', due: 'followUpOn' },
    prepare: ({ topic, status, at, due }) => ({
      title: ENQUIRY_TOPICS.find((t) => t.value === topic)?.title ?? 'Enquiry',
      subtitle: [
        ENQUIRY_STATUSES.find((s) => s.value === status)?.title,
        at && new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        due && `follow up ${due}`,
      ]
        .filter(Boolean)
        .join(' / '),
    }),
  },
});
