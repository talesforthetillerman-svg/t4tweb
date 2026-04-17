import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'footerSection',
  title: 'Footer Section',
  type: 'document',
  fields: [
    defineField({ name: 'logo', title: 'Logo', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'logoAlt', title: 'Logo Alt Text', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({ name: 'ctaLabel', title: 'CTA Label', type: 'string' }),
    defineField({ name: 'ctaHref', title: 'CTA URL', type: 'string' }),
    defineField({ name: 'copyright', title: 'Copyright', type: 'string' }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'id', title: 'Editor ID', type: 'string' }),
          defineField({ name: 'name', title: 'Name', type: 'string' }),
          defineField({ name: 'href', title: 'URL', type: 'string' }),
        ],
      }],
    }),
    // elementStyles is managed via editor deploy API, not Studio UI.
    defineField({ name: 'updatedAt', title: 'Last updated (visual editor)', type: 'datetime', readOnly: true }),
  ],
})
