/**
 * Hero element style overrides.
 * Maps target ID to computed style properties that should persist.
 */

export interface HeroElementStyle {
  targetId: string
  // Text properties
  text?: string
  color?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  // Gradient (for accent only)
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
  // Layout
  x?: number
  y?: number
  // Dimensions
  width?: number
  height?: number
  scale?: number
  maxWidth?: number
}

export interface HeroStyles {
  [targetId: string]: HeroElementStyle
}
