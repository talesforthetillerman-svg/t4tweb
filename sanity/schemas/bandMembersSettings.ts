import { defineField, defineType } from 'sanity'

/**
 * Band Members Section Settings
 *
 * Stores API-managed settings for the Band Members section.
 * `elementStyles` is intentionally not exposed in Studio: editor deploy writes it as
 * a structured object and the public loader normalizes it before render.
 */

const bandMembersSettings = defineType({
  name: 'bandMembersSettings',
  title: 'Band Members Section Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'backgroundImage',
      title: 'Background Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'headerEyebrow',
      title: 'Header Eyebrow',
      type: 'string',
    }),
    defineField({
      name: 'headerTitle',
      title: 'Header Title',
      type: 'string',
    }),
    defineField({
      name: 'headerDescription',
      title: 'Header Description',
      type: 'text',
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      hidden: true,
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Band Members Settings',
        subtitle: 'Layout and style overrides',
      }
    },
  },
})

export default bandMembersSettings
