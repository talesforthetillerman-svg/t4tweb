import { defineField, defineType } from 'sanity'
import { CalendarIcon } from '@sanity/icons'

export default defineType({
  name: 'concert',
  title: 'Concert',
  type: 'document',
  icon: CalendarIcon,
  fields: [
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
  ],
  orderings: [{ title: 'Date', name: 'date', by: [{ field: 'date', direction: 'desc' }] }],
  preview: {
    select: {
      title: 'venue',
      subtitle: 'city',
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
