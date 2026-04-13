import { defineField, defineType } from 'sanity'
import { ImageIcon } from '@sanity/icons'
import { elementStylesFieldConfig } from './elementStyleOverrides'

export default defineType({
  name: 'introBanner',
  title: 'Intro banner (GIF block)',
  type: 'document',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'bannerText',
      title: 'Banner text',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'gifUrl',
      title: 'GIF URL or path',
      type: 'string',
      description: 'Public URL or site path (e.g. /images/...). Set from the visual editor deploy.',
    }),
    defineField({ name: 'bookLabel', title: 'Primary button label', type: 'string' }),
    defineField({ name: 'bookHref', title: 'Primary button link', type: 'string' }),
    defineField({ name: 'pressLabel', title: 'Secondary button label', type: 'string' }),
    defineField({ name: 'pressHref', title: 'Secondary button link', type: 'string' }),
    // elementStylesFieldConfig() — managed via editor API, not Studio UI
    defineField({
      name: 'updatedAt',
      title: 'Last updated (visual editor)',
      type: 'datetime',
      readOnly: true,
    }),
  ],
})
