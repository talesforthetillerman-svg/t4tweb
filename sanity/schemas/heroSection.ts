import { defineField, defineType } from 'sanity'
import { StarIcon } from '@sanity/icons'

/** Shared optional fields for visual-editor geometry / typography (matches editor-deploy + hero-section). */
const heroStyleOverrideFields = [
  defineField({ name: 'x', title: 'X offset (px)', type: 'number' }),
  defineField({ name: 'y', title: 'Y offset (px)', type: 'number' }),
  defineField({ name: 'width', title: 'Width (px)', type: 'number' }),
  defineField({ name: 'height', title: 'Height (px)', type: 'number' }),
  defineField({ name: 'scale', title: 'Scale', type: 'number' }),
  defineField({ name: 'fontSize', title: 'Font size (px)', type: 'number' }),
  defineField({ name: 'fontWeight', title: 'Font weight', type: 'number' }),
  defineField({ name: 'letterSpacing', title: 'Letter spacing (px)', type: 'number' }),
  defineField({ name: 'lineHeight', title: 'Line height', type: 'number' }),
  defineField({ name: 'color', title: 'Color (hex)', type: 'string' }),
  defineField({ name: 'maxWidth', title: 'Max width (px)', type: 'number' }),
]

function styleTarget(title: string, name: string) {
  return defineField({
    name,
    title,
    type: 'object',
    fields: [...heroStyleOverrideFields],
    options: { collapsible: true, collapsed: true },
  })
}

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
    defineField({
      name: 'elementStyles',
      title: 'Visual editor layout overrides',
      type: 'object',
      description: 'Position, size, and type saved from /editor deploy. Keys match on-page data-editable ids.',
      options: { collapsible: true, collapsed: true },
      fields: [
        styleTarget('Hero section (root)', 'hero-section'),
        styleTarget('Hero background image', 'hero-bg-image'),
        styleTarget('Hero title (block)', 'hero-title'),
        styleTarget('Hero title — main line', 'hero-title-main'),
        styleTarget('Hero title — accent line', 'hero-title-accent'),
        styleTarget('Hero subtitle', 'hero-subtitle'),
        styleTarget('Hero logo', 'hero-logo'),
        styleTarget('Hero buttons row', 'hero-buttons'),
        styleTarget('Scroll indicator', 'hero-scroll-indicator'),
      ],
    }),
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
