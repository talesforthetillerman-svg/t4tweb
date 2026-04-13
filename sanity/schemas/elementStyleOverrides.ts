/**
 * Generic elementStyles field config for storing visual editor layout + typography + image filters.
 * Stored as a JSON object where keys are node IDs (can contain hyphens) and values are style objects.
 * Returns an object config with minimal fields to satisfy Sanity's schema validation.
 *
 * Usage: defineField(elementStylesFieldConfig())
 */
export function elementStylesFieldConfig(title: string = 'Visual editor layout overrides') {
  return {
    name: 'elementStyles',
    title,
    type: 'object',
    description: 'Stores arbitrary JSON object with node ID keys (can contain hyphens like hero-section, nav-logo). Set from visual editor deploy.',
    fields: [],
    options: { collapsible: true, collapsed: true },
  } as any
}
