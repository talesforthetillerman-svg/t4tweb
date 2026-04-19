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
    defineField({
      name: 'concertsManagedByEditor',
      title: 'Concerts managed by custom editor',
      type: 'boolean',
      readOnly: true,
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
