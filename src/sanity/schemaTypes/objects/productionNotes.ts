import { defineField, defineType } from 'sanity';

/**
 * Manufacturing / operations metadata. Fields here map to Cinque's SLA and
 * production workflow, and the storefront does not render any of them.
 *
 * "Internal" means not-displayed, NOT confidential: the dataset is public on
 * Sanity's free plan, so everything below is world-readable over the query
 * API. Casting house, lead times and QC notes are commercially sensitive —
 * treat this object as a public spec sheet, and keep anything that would
 * genuinely hurt if a competitor read it out of Sanity altogether.
 */
export const productionNotes = defineType({
  name: 'productionNotes',
  title: 'Production Notes (Internal)',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: 'dropNumber',
      title: 'Drop Number',
      type: 'string',
      description: 'Internal drop / batch identifier (e.g. "D-014").',
    }),
    defineField({
      name: 'internalSLADays',
      title: 'Internal SLA (days)',
      type: 'number',
      description: 'Target days from order to dispatch for made-to-order pieces.',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'clearResinPrintNotes',
      title: 'Clear Resin Printing Notes',
      type: 'text',
      rows: 3,
      description:
        'SLA/DLP clear resin print settings, support removal and post-cure notes for the master pattern.',
    }),
    defineField({
      name: 'castingHouse',
      title: 'Casting House',
      type: 'string',
    }),
    defineField({
      name: 'leadTimeNotes',
      title: 'Lead Time Notes',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'qcChecklist',
      title: 'QC Checklist',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
  ],
});
