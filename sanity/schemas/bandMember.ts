import { defineField, defineType } from 'sanity'
import { UserIcon } from '@sanity/icons'

export default defineType({
  name: 'bandMember',
  title: 'Band Member',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({ name: 'fullName', title: 'Full Name', type: 'string' }),
    defineField({ name: 'role', title: 'Role / Instrument', type: 'string' }),
    defineField({ name: 'portraitImage', title: 'Portrait', type: 'image' }),
    defineField({ name: 'bio', title: 'Biography', type: 'text' }),
    defineField({ name: 'order', title: 'Display Order', type: 'number', initialValue: 0 }),
    defineField({ 
      name: 'socialLinks', 
      title: 'Social Links', 
      type: 'array', 
      of: [{ 
        type: 'object', 
        fields: [
          defineField({ 
            name: 'platform', 
            title: 'Platform', 
            type: 'string', 
            options: { 
              list: [
                { title: 'Instagram', value: 'instagram' },
                { title: 'Twitter', value: 'twitter' },
                { title: 'Facebook', value: 'facebook' },
                { title: 'YouTube', value: 'youtube' },
                { title: 'TikTok', value: 'tiktok' },
                { title: 'Spotify', value: 'spotify' },
                { title: 'Apple Music', value: 'apple-music' },
                { title: 'SoundCloud', value: 'soundcloud' }
              ]
            } 
          }),
          defineField({ name: 'url', title: 'URL', type: 'url' })
        ]
      }]
    }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'fullName',
      media: 'portraitImage',
    },
    prepare(selection) {
      const {title, media} = selection
      return {
        title: title || 'Band Member',
        subtitle: 'Band Member',
        media: media,
      }
    }
  }
})
