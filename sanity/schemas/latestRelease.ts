import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'latestRelease',
  title: 'Latest Release',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'subtitle', title: 'Subtitle', type: 'text' }),
    defineField({ name: 'youtubeId', title: 'YouTube Video ID', type: 'string' }),
    defineField({
      name: 'ctaButtons',
      title: 'CTA Buttons',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string' }),
          defineField({ name: 'href', title: 'URL', type: 'url' }),
        ],
      }],
    }),
  ],
})
