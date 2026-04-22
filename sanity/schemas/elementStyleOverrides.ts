import { defineField } from 'sanity'

/** Visual-editor layout + typography (shared by hero + navigation elementStyles). */
export const elementStyleOverrideFields = [
  defineField({ name: 'x', title: 'X offset (px)', type: 'number' }),
  defineField({ name: 'y', title: 'Y offset (px)', type: 'number' }),
  defineField({ name: 'width', title: 'Width (px)', type: 'number' }),
  defineField({ name: 'height', title: 'Height (px)', type: 'number' }),
  defineField({ name: 'scale', title: 'Scale', type: 'number' }),
  defineField({ name: 'fontSize', title: 'Font size (px)', type: 'number' }),
  defineField({ name: 'fontWeight', title: 'Font weight', type: 'number' }),
  defineField({ name: 'letterSpacing', title: 'Letter spacing (px)', type: 'number' }),
  defineField({ name: 'lineHeight', title: 'Line height', type: 'number' }),
  defineField({ name: 'color', title: 'Color (hex)', type: 'string' }),
  defineField({ name: 'maxWidth', title: 'Max width (px)', type: 'number' }),
]

export function elementStyleTargetField(title: string, name: string) {
  return defineField({
    name,
    title,
    type: 'object',
    fields: [...elementStyleOverrideFields],
    options: { collapsible: true, collapsed: true },
  })
}
