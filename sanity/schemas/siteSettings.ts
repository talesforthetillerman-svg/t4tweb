import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social & Streaming' },
  ],
  fields: [
    defineField({ name: 'siteTitle', title: 'Site Title', type: 'string', group: 'seo' }),
    defineField({ name: 'siteDescription', title: 'Site Description', type: 'text', group: 'seo' }),
    defineField({ name: 'footerTagline', title: 'Footer Tagline', type: 'string', group: 'general' }),
    defineField({ name: 'ogImage', title: 'OG Image', type: 'image', group: 'seo' }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      group: 'social',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'name', title: 'Name', type: 'string' }),
          defineField({ name: 'url', title: 'URL', type: 'url' }),
        ],
      }],
    }),
    defineField({
      name: 'streamingPlatforms',
      title: 'Streaming Platforms',
      type: 'array',
      group: 'social',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'name', title: 'Name', type: 'string' }),
          defineField({ name: 'url', title: 'URL', type: 'url' }),
        ],
      }],
    }),
  ],
})
