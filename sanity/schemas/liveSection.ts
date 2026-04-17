import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'liveSection',
  title: 'Live Section',
  type: 'document',
  fields: [
    defineField({
      name: 'backgroundImage',
      title: 'Background image',
      type: 'image',
    }),
    // elementStylesFieldConfig() — managed via editor API, not Studio UI
    defineField({
      name: 'updatedAt',
      title: 'Last updated (visual editor)',
      type: 'datetime',
      readOnly: true,
    }),
  ],
})
