import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({ name: 'brandName', title: 'Brand Name', type: 'string' }),
    defineField({ name: 'brandLogo', title: 'Brand Logo', type: 'image' }),
    defineField({
      name: 'links',
      title: 'Navigation Links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string' }),
            defineField({ name: 'href', title: 'Anchor / URL', type: 'string' }),
          ],
        },
      ],
    }),
    defineField({ name: 'ctaLabel', title: 'CTA Label', type: 'string' }),
    defineField({ name: 'ctaHref', title: 'CTA Link', type: 'string' }),
    // elementStylesFieldConfig() — managed via editor API, not Studio UI
    defineField({
      name: 'updatedAt',
      title: 'Last updated (visual editor)',
      type: 'datetime',
      readOnly: true,
    }),
  ],
})
