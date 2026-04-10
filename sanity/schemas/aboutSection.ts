import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'aboutSection',
  title: 'About Section',
  type: 'document',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'bioParagraphs', title: 'Bio Paragraphs', type: 'array', of: [{ type: 'text' }] }),
    defineField({ name: 'bioTagline', title: 'Bio Tagline', type: 'string' }),
    defineField({ name: 'backgroundImage', title: 'Background Image', type: 'image' }),
  ],
})
