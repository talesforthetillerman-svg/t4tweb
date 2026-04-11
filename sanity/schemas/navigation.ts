import { defineField, defineType } from 'sanity'
import { elementStyleTargetField } from './elementStyleOverrides'

const NAV_STYLE_TARGETS: Array<[string, string]> = [
  ['Navigation bar', 'navigation'],
  ['Inner container', 'navigation-inner'],
  ['Logo', 'nav-logo'],
  ['Brand name', 'nav-brand-name'],
  ...([0, 1, 2, 3, 4].map((i) => [`Nav link ${i + 1}`, `nav-link-${i}`] as [string, string])),
  ['Book (desktop)', 'nav-book-button'],
  ...([0, 1, 2, 3, 4].map((i) => [`Mobile link ${i + 1}`, `nav-mobile-link-${i}`] as [string, string])),
  ['Book (mobile)', 'nav-mobile-book-button'],
]

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
    defineField({
      name: 'elementStyles',
      title: 'Visual editor layout overrides',
      type: 'object',
      description: 'Position and typography from on-site editor deploy (keys match data-editor-node-id).',
      options: { collapsible: true, collapsed: true },
      fields: NAV_STYLE_TARGETS.map(([title, name]) => elementStyleTargetField(title, name)),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last updated (visual editor)',
      type: 'datetime',
      readOnly: true,
    }),
  ],
})
