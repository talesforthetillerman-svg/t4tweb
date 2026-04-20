import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'contactSection',
  title: 'Contact Section',
  type: 'document',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({ name: 'middleText', title: 'Middle Text', type: 'string' }),
    defineField({
      name: 'contactMethods',
      title: 'Contact Methods',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'description', title: 'Description', type: 'string' }),
          defineField({ name: 'href', title: 'URL / mailto', type: 'string' }),
          defineField({ name: 'label', title: 'Display Label', type: 'string' }),
          defineField({ name: 'contactName', title: 'Contact Person', type: 'string' }),
        ],
      }],
    }),
    defineField({ name: 'backgroundImage', title: 'Background Image', type: 'image', options: { hotspot: true } }),
    // elementStyles is managed via editor deploy API, not Studio UI.
    defineField({ name: 'updatedAt', title: 'Last updated (visual editor)', type: 'datetime', readOnly: true }),
  ],
})
