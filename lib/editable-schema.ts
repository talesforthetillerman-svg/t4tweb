/**
 * Editable properties schema by target ID.
 * Defines what properties can be edited for each element in the Hero section.
 * 
 * Only properties listed here are exposed in the editor UI and serialized on deploy.
 */

export const HERO_EDITABLE_PROPS: Record<string, {
  label: string
  props: Array<{
    key: string
    label: string
    type: "text" | "color" | "number" | "number-range"
    min?: number
    max?: number
    step?: number
  }>
}> = {
  "hero-subtitle": {
    label: "Hero Subtitle",
    props: [
      { key: "text", label: "Text", type: "text" },
      { key: "color", label: "Color", type: "color" },
      { key: "fontSize", label: "Font Size (px)", type: "number", min: 8, max: 32, step: 0.5 },
      { key: "letterSpacing", label: "Letter Spacing (px)", type: "number", min: -2, max: 10, step: 0.25 },
      { key: "x", label: "X Position", type: "number", min: -1000, max: 1000, step: 1 },
      { key: "y", label: "Y Position", type: "number", min: -1000, max: 1000, step: 1 },
      { key: "maxWidth", label: "Max Width (px)", type: "number", min: 100, max: 1000, step: 10 },
    ],
  },
  "hero-logo": {
    label: "Hero Logo",
    props: [
      { key: "width", label: "Width (px)", type: "number", min: 20, max: 400, step: 1 },
      { key: "height", label: "Height (px)", type: "number", min: 20, max: 400, step: 1 },
      { key: "scale", label: "Scale", type: "number", min: 0.1, max: 3, step: 0.1 },
      { key: "x", label: "X Position", type: "number", min: -1000, max: 1000, step: 1 },
      { key: "y", label: "Y Position", type: "number", min: -1000, max: 1000, step: 1 },
    ],
  },
  "hero-scroll-indicator": {
    label: "Scroll Indicator",
    props: [
      { key: "x", label: "X Position", type: "number", min: -1000, max: 1000, step: 1 },
      { key: "y", label: "Y Position", type: "number", min: -1000, max: 1000, step: 1 },
    ],
  },
}
