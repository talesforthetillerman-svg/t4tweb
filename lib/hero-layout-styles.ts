import type { CSSProperties } from "react"

export const TEXT_EMPHASIS_SHADOW = "0 2px 10px rgba(0, 0, 0, 0.72), 0 0 2px rgba(0, 0, 0, 0.9)"

/** Integer px avoids subpixel drift between editor measure, Sanity JSON, and SSR. */
export function roundLayoutPx(n: number): number {
  return Math.round(n)
}

/**
 * Default hero layout: same as visual-editor `applyNodeToDom` for non-scroll nodes —
 * `translate(x,y)` with `transform-origin: top left`.
 */
export function buildHeroStandardLayoutStyle(opts: {
  x: number
  y: number
  scale?: number
  width?: number
  height?: number
}): CSSProperties {
  const tx = roundLayoutPx(opts.x)
  const ty = roundLayoutPx(opts.y)
  const scaleVal = opts.scale ?? 1
  const needScale = typeof opts.scale === "number" && scaleVal !== 1
  const parts: string[] = [`translate(${tx}px, ${ty}px)`]
  if (needScale) parts.push(`scale(${scaleVal})`)
  const result: CSSProperties = {
    transform: parts.join(" "),
    transformOrigin: "top left",
  }
  if (typeof opts.width === "number") result.width = `${roundLayoutPx(opts.width)}px`
  if (typeof opts.height === "number") result.height = `${roundLayoutPx(opts.height)}px`
  return result
}

/**
 * Scroll block: uses same top-left coordinate system as editor.
 * Matches `applyNodeToDom` logic in visual-editor for parity.
 */
export function buildHeroScrollIndicatorLayoutStyle(opts: {
  x: number
  y: number
  scale?: number
  width?: number
  height?: number
}): CSSProperties {
  const tx = roundLayoutPx(opts.x)
  const ty = roundLayoutPx(opts.y)
  const scaleVal = opts.scale ?? 1
  const needScale = typeof opts.scale === "number" && scaleVal !== 1
  const parts: string[] = [`translate(calc(-50% + ${tx}px), ${ty}px)`]
  if (needScale) parts.push(`scale(${scaleVal})`)
  const result: CSSProperties = {
    position: "absolute",
    left: "50%",
    bottom: "2rem",
    transform: parts.join(" "),
    transformOrigin: "center bottom",
  }
  if (typeof opts.width === "number") result.width = `${roundLayoutPx(opts.width)}px`
  if (typeof opts.height === "number") result.height = `${roundLayoutPx(opts.height)}px`
  return result
}

/** Apply scroll layout to a live DOM node (visual editor) — keeps parity with public CSS. */
export function applyScrollIndicatorLayoutToElement(
  el: HTMLElement,
  g: { x: number; y: number; width: number; height: number },
  nodeScale: number
): void {
  const tx = roundLayoutPx(g.x)
  const ty = roundLayoutPx(g.y)
  el.style.left = "50%"
  el.style.bottom = "2rem"
  el.style.transformOrigin = "center bottom"
  const parts: string[] = [`translate(calc(-50% + ${tx}px), ${ty}px)`]
  if (nodeScale !== 1) parts.push(`scale(${nodeScale})`)
  el.style.transform = parts.join(" ")
}

export function clearScrollIndicatorLayoutFromElement(el: HTMLElement): void {
  el.style.removeProperty("left")
  el.style.removeProperty("bottom")
  el.style.removeProperty("transform")
  el.style.removeProperty("transform-origin")
}

export function toCssFilterPercentValue(value: number): string {
  return `${value}%`
}

function isIdentityOpacityValue(value: number): boolean {
  return Math.abs(value - 1) < 0.0001
}

function isIdentityFilterPercentValue(value: number): boolean {
  return Math.abs(value - 100) < 0.0001
}

/**
 * Maps CMS `elementStyles` map entries to inline CSS (hero, navigation, etc.).
 * Same rules as visual-editor `applyNodeToDom` for non-scroll nodes.
 */
export function getElementLayoutStyle(
  elementStyles: Record<string, unknown> | undefined,
  targetId: string,
  options?: { includeGeometry?: boolean }
): CSSProperties {
  if (!elementStyles || !elementStyles[targetId]) return {}

  const styles = elementStyles[targetId] as Record<string, unknown>
  const includeGeometry = options?.includeGeometry ?? true
  const hasX = typeof styles.x === "number"
  const hasY = typeof styles.y === "number"
  const tx = hasX ? roundLayoutPx(styles.x as number) : 0
  const ty = hasY ? roundLayoutPx(styles.y as number) : 0
  const scaleVal = typeof styles.scale === "number" ? styles.scale : 1
  const needTranslate = hasX || hasY
  const needScale = typeof styles.scale === "number" && scaleVal !== 1
  const shouldApplyGeometry = includeGeometry && (needTranslate || needScale)

  // Special layout for scroll indicator - ALWAYS apply positioning, even if no geometry
  if (targetId === "hero-scroll-indicator") {
    // Always build scroll layout for proper positioning context (position: absolute + transform-origin)
    const layout = buildHeroScrollIndicatorLayoutStyle({
      x: tx,
      y: ty,
      scale: needScale ? scaleVal : undefined,
      width: includeGeometry && shouldApplyGeometry && typeof styles.width === "number" ? roundLayoutPx(styles.width as number) : undefined,
      height: includeGeometry && shouldApplyGeometry && typeof styles.height === "number" ? roundLayoutPx(styles.height as number) : undefined,
    })
    const result: CSSProperties = { ...layout }
    if (typeof styles.opacity === "number" && !isIdentityOpacityValue(styles.opacity)) result.opacity = styles.opacity
    return result
  }

  const layout =
    shouldApplyGeometry
      ? buildHeroStandardLayoutStyle({
          x: tx,
          y: ty,
          scale: needScale ? scaleVal : undefined,
          width:
            includeGeometry && typeof styles.width === "number"
              ? roundLayoutPx(styles.width as number)
              : undefined,
          height:
            includeGeometry && typeof styles.height === "number"
              ? roundLayoutPx(styles.height as number)
              : undefined,
        })
      : {}

  const result: CSSProperties = { ...layout }

  if (includeGeometry && !shouldApplyGeometry) {
    if (typeof styles.width === "number") result.width = `${roundLayoutPx(styles.width as number)}px`
    if (typeof styles.height === "number") result.height = `${roundLayoutPx(styles.height as number)}px`
  }
  if (includeGeometry && typeof styles.fontSize === "number") result.fontSize = `${styles.fontSize}px`
  if (typeof styles.fontWeight === "number") result.fontWeight = styles.fontWeight
  if (includeGeometry && typeof styles.letterSpacing === "number") result.letterSpacing = `${styles.letterSpacing}px`
  if (includeGeometry && typeof styles.lineHeight === "number") result.lineHeight = styles.lineHeight
  if (typeof styles.color === "string") result.color = styles.color
  if (typeof styles.fontFamily === "string" && styles.fontFamily.trim()) result.fontFamily = styles.fontFamily
  if (styles.textAlign === "left" || styles.textAlign === "center" || styles.textAlign === "right") {
    result.textAlign = styles.textAlign
    result.justifyContent =
      styles.textAlign === "left" ? "flex-start" : styles.textAlign === "right" ? "flex-end" : "center"
  }
  if (includeGeometry && typeof styles.maxWidth === "number") result.maxWidth = `${styles.maxWidth}px`

  // Text styling
  if (styles.bold === true) result.fontWeight = "bold"
  if (styles.italic === true) result.fontStyle = "italic"
  if (styles.underline === true) result.textDecoration = "underline"
  if (styles.textShadowEnabled === true) result.textShadow = TEXT_EMPHASIS_SHADOW

  // Opacity and effects
  if (typeof styles.opacity === "number" && !isIdentityOpacityValue(styles.opacity)) result.opacity = styles.opacity

  // Image filters (contrast, saturation, brightness, negative)
  const filterParts: string[] = []
  if (typeof styles.contrast === "number" && !isIdentityFilterPercentValue(styles.contrast)) {
    filterParts.push(`contrast(${toCssFilterPercentValue(styles.contrast)})`)
  }
  if (typeof styles.saturation === "number" && !isIdentityFilterPercentValue(styles.saturation)) {
    filterParts.push(`saturate(${toCssFilterPercentValue(styles.saturation)})`)
  }
  if (typeof styles.brightness === "number" && !isIdentityFilterPercentValue(styles.brightness)) {
    filterParts.push(`brightness(${toCssFilterPercentValue(styles.brightness)})`)
  }
  if (styles.negative === true) filterParts.push("invert(1)")
  if (filterParts.length > 0) result.filter = filterParts.join(" ")

  // Gradient text
  if (styles.gradientEnabled === true) {
    const gradientStart = typeof styles.gradientStart === "string" && styles.gradientStart ? styles.gradientStart : "#FFB15A"
    const gradientEnd = typeof styles.gradientEnd === "string" && styles.gradientEnd ? styles.gradientEnd : "#FF6C00"
    result.backgroundImage = `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`
    result.backgroundClip = "text"
    result.WebkitBackgroundClip = "text"
    result.WebkitTextFillColor = "transparent"
    result.color = "transparent"
  }

  return result
}
