import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'concert',
  title: 'Concert',
  type: 'document',
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
  ],
  orderings: [{ title: 'Date', name: 'date', by: [{ field: 'date', direction: 'desc' }] }],
})
