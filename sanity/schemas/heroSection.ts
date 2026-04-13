import { defineField, defineType } from 'sanity'
import { StarIcon } from '@sanity/icons'

export default defineType({
  name: 'heroSection',
  title: 'Hero Section',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({
      name: 'titleHighlight',
      title: 'Title Highlight Text',
      type: 'string',
      description: 'Legacy accent line when not using segments (e.g. "funk, soul and world music").',
    }),
    defineField({
      name: 'titleSegments',
      title: 'Title segments',
      description: 'Multi-part hero title from the visual editor. When set, the site prefers this over plain title + highlight.',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'heroTitleSegment',
          fields: [
            defineField({ name: 'text', title: 'Text', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'color', title: 'Color', type: 'string' }),
            defineField({ name: 'bold', title: 'Bold', type: 'boolean', initialValue: false }),
            defineField({ name: 'italic', title: 'Italic', type: 'boolean', initialValue: false }),
            defineField({ name: 'underline', title: 'Underline', type: 'boolean', initialValue: false }),
            defineField({
              name: 'opacity',
              title: 'Opacity',
              type: 'number',
              initialValue: 1,
              validation: (Rule) => Rule.min(0).max(1),
            }),
            defineField({ name: 'fontSize', title: 'Font size', type: 'string' }),
            defineField({ name: 'fontFamily', title: 'Font family', type: 'string' }),
            defineField({ name: 'gradientEnabled', title: 'Gradient enabled', type: 'boolean' }),
            defineField({ name: 'gradientStart', title: 'Gradient start', type: 'string' }),
            defineField({ name: 'gradientEnd', title: 'Gradient end', type: 'string' }),
          ],
        },
      ],
    }),
    defineField({ name: 'subtitle', title: 'Subtitle', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({ name: 'scrollLabel', title: 'Scroll Label', type: 'string', description: 'Text shown in scroll indicator (e.g. "SCROLL")' }),
    defineField({ name: 'logo', title: 'Logo', type: 'image' }),
    defineField({ name: 'backgroundImage', title: 'Background Image', type: 'image' }),
    defineField({
      name: 'ctaButtons',
      title: 'CTA Buttons',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string' }),
            defineField({ name: 'href', title: 'Link', type: 'string' }),
            defineField({
              name: 'variant',
              title: 'Variant',
              type: 'string',
              options: {
                list: [
                  { title: 'Primary', value: 'primary' },
                  { title: 'Secondary', value: 'secondary' },
                ],
              },
            }),
          ],
        },
      ],
    }),
    // elementStylesFieldConfig() — managed via editor API, not Studio UI
    defineField({
      name: 'updatedAt',
      title: 'Last updated (visual editor)',
      type: 'datetime',
      readOnly: true,
      description: 'Set automatically when publishing changes from the on-site editor.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      backgroundImage: 'backgroundImage',
      logo: 'logo',
    },
    prepare(selection) {
      const { title, backgroundImage, logo } = selection
      return {
        title: title || 'Hero Section',
        subtitle: 'Hero Section',
        media: logo || backgroundImage,
      }
    },
  },
})
