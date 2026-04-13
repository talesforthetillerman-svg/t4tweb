import { defineType } from 'sanity'

/**
 * Band Members Section Settings
 *
 * Stores layout, styling, and positioning overrides for the Band Members section.
 * These are materialized from homeEditorState when changes are saved in the visual editor.
 *
 * This document is read by bandMembersLoader and applied to BandMembersSection.
 */

export const bandMembersSettings = defineType({
  name: 'bandMembersSettings',
  title: 'Band Members Section Settings',
  type: 'document',
  fields: [
    {
      name: 'elementStyles',
      title: 'Element Styles',
      type: 'json',
      description: 'Styling and layout overrides for band section elements (position, size, colors, typography)',
      hidden: true,
    },
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
