import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'bandMember',
  title: 'Band Member',
  type: 'document',
  fields: [
    defineField({ name: 'fullName', title: 'Full Name', type: 'string' }),
    defineField({ name: 'role', title: 'Role / Instrument', type: 'string' }),
    defineField({ name: 'portraitImage', title: 'Portrait', type: 'image' }),
    defineField({ name: 'order', title: 'Display Order', type: 'number', initialValue: 0 }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
})
