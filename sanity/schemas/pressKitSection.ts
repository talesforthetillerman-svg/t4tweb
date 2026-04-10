import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'pressKitSection',
  title: 'Press Kit Section',
  type: 'document',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({ name: 'pressKitPdf', title: 'Press Kit PDF', type: 'file' }),
    defineField({
      name: 'resources',
      title: 'Resources',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'description', title: 'Description', type: 'string' }),
          defineField({ name: 'href', title: 'URL', type: 'url' }),
        ],
      }],
    }),
    defineField({ name: 'managerPhoto', title: 'Manager Photo', type: 'image' }),
    defineField({ name: 'managerName', title: 'Manager Name', type: 'string' }),
    defineField({ name: 'managerRole', title: 'Manager Role', type: 'string' }),
    defineField({ name: 'managerEmail', title: 'Manager Email', type: 'string' }),
    defineField({ name: 'backgroundImage', title: 'Background Image', type: 'image' }),
  ],
})
