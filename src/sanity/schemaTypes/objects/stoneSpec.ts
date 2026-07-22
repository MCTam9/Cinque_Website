import { defineField, defineType } from 'sanity';

/**
 * Precise stone specification for a variant. Dimensions are in millimetres
 * with decimal precision to match Cinque's manufacturing/QC parameters.
 */
export const stoneSpec = defineType({
  name: 'stoneSpec',
  title: 'Stone Specification',
  type: 'object',
  fields: [
    defineField({
      name: 'stoneType',
      title: 'Stone Type',
      type: 'string',
      options: {
        list: [
          { title: 'Diamond', value: 'diamond' },
          { title: 'Lab-Grown Diamond', value: 'lab_diamond' },
          { title: 'Sapphire', value: 'sapphire' },
          { title: 'Emerald', value: 'emerald' },
          { title: 'Ruby', value: 'ruby' },
          { title: 'Pearl', value: 'pearl' },
          { title: 'Moonstone', value: 'moonstone' },
          { title: 'Topaz', value: 'topaz' },
          { title: 'None', value: 'none' },
        ],
      },
    }),
    defineField({
      name: 'carat',
      title: 'Carat',
      type: 'number',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'dimensionsMm',
      title: 'Dimensions (mm)',
      type: 'object',
      fields: [
        defineField({ name: 'length', title: 'Length (mm)', type: 'number' }),
        defineField({ name: 'width', title: 'Width (mm)', type: 'number' }),
        defineField({ name: 'depth', title: 'Depth (mm)', type: 'number' }),
      ],
      options: { columns: 3 },
    }),
    defineField({
      name: 'cut',
      title: 'Cut',
      type: 'string',
      options: {
        list: [
          'round-brilliant',
          'princess',
          'oval',
          'emerald',
          'pear',
          'marquise',
          'cushion',
          'rose',
          'cabochon',
          'raw',
        ],
      },
    }),
    defineField({
      name: 'settingType',
      title: 'Setting Type',
      type: 'string',
      options: {
        list: ['prong', 'bezel', 'flush', 'pavé', 'tension', 'channel'],
      },
    }),
    defineField({
      name: 'count',
      title: 'Number of Stones',
      type: 'number',
      initialValue: 1,
      validation: (rule) => rule.min(0).integer(),
    }),
  ],
});
