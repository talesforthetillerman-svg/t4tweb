import { defineField, defineType } from 'sanity'
import { CalendarIcon } from '@sanity/icons'

export default defineType({
  name: 'concert',
  title: 'Concert',
  type: 'document',
  icon: CalendarIcon,
  fields: [
    defineField({ name: 'editorId', title: 'Visual editor ID', type: 'number', readOnly: true }),
    defineField({ name: 'locationName', title: 'Location name', type: 'string' }),
    defineField({ name: 'locationLink', title: 'Google Maps URL', type: 'url' }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          { title: 'World Music', value: 'World Music' },
          { title: 'Funk', value: 'Funk' },
          { title: 'Soul', value: 'Soul' },
          { title: 'Reggae', value: 'Reggae' },
          { title: 'Global Grooves', value: 'Global Grooves' },
        ],
      },
    }),
    defineField({ name: 'priceText', title: 'Price', type: 'string' }),
    defineField({ name: 'venue', title: 'Venue', type: 'string' }),
    defineField({ name: 'city', title: 'City', type: 'string' }),
    defineField({ name: 'country', title: 'Country', type: 'string' }),
    defineField({ name: 'date', title: 'Date', type: 'date' }),
    defineField({ name: 'time', title: 'Time', type: 'string' }),
    defineField({ name: 'status', title: 'Status', type: 'string', options: { list: [{ title: 'Upcoming', value: 'Upcoming' }, { title: 'Completed', value: 'Completed' }, { title: 'Cancelled', value: 'Cancelled' }] } }),
    defineField({ name: 'genre', title: 'Genre', type: 'string' }),
    defineField({ name: 'capacity', title: 'Capacity', type: 'string' }),
    defineField({ name: 'price', title: 'Price (EUR)', type: 'number' }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({ name: 'image', title: 'Event Image', type: 'image' }),
    defineField({ name: 'ticketUrl', title: 'Ticket URL', type: 'url' }),
    defineField({ name: 'isFeatured', title: 'Featured Event', type: 'boolean', initialValue: false }),
    defineField({
      name: 'updatedAt',
      title: 'Last updated (visual editor)',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  orderings: [{ title: 'Date', name: 'date', by: [{ field: 'date', direction: 'desc' }] }],
  preview: {
    select: {
      title: 'locationName',
      subtitle: 'date',
      media: 'image',
    },
    prepare(selection) {
      const {title, subtitle, media} = selection
      return {
        title: title || 'Untitled Concert',
        subtitle: subtitle && `${subtitle}, `,
        media: media,
      }
    }
  }
})
