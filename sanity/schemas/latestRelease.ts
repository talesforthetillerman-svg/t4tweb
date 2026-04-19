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
      name: 'videoSources',
      title: 'Video sources',
      type: 'array',
      validation: (rule) => rule.max(3),
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'type', title: 'Type', type: 'string', initialValue: 'youtube' }),
          defineField({ name: 'url', title: 'Original URL', type: 'url' }),
          defineField({ name: 'youtubeId', title: 'Normalized YouTube ID', type: 'string' }),
          defineField({ name: 'enabled', title: 'Enabled', type: 'boolean', initialValue: true }),
          defineField({ name: 'order', title: 'Order', type: 'number' }),
        ],
      }],
    }),
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
    // elementStylesFieldConfig() — managed via editor API, not Studio UI
    defineField({
      name: 'updatedAt',
      title: 'Last updated (visual editor)',
      type: 'datetime',
      readOnly: true,
    }),
  ],
})
