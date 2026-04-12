import type { CSSProperties } from "react"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

export function buildInlineStyleFromOverride(
  override: HomeEditorNodeOverride | undefined,
  includeGeometry: boolean
): CSSProperties | undefined {
  if (!override) return undefined
  const style: CSSProperties = {}
  const scale = typeof override.style.scale === "number" ? Math.max(0.1, override.style.scale) : 1

  if (includeGeometry && (override.explicitPosition || (override.explicitStyle && scale !== 1))) {
    style.transform =
      scale !== 1
        ? `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px) scale(${scale})`
        : `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px)`
    style.transformOrigin = "top left"
  }

  if (includeGeometry && override.explicitSize) {
    style.width = `${Math.max(8, Math.round(override.geometry.width))}px`
    style.height = `${Math.max(8, Math.round(override.geometry.height))}px`
  }

  if (override.explicitStyle) {
    if (override.style.opacity !== undefined) style.opacity = override.style.opacity
    if (override.content.gradientEnabled) {
      style.background = `linear-gradient(135deg, ${override.content.gradientStart || "#111111"}, ${override.content.gradientEnd || "#000000"})`
    } else if (override.style.backgroundColor) {
      style.backgroundColor = override.style.backgroundColor
    }
    if (override.style.color) style.color = override.style.color
    if (override.style.fontWeight) style.fontWeight = override.style.fontWeight as CSSProperties["fontWeight"]
    if (override.style.fontStyle) style.fontStyle = override.style.fontStyle as CSSProperties["fontStyle"]
    if (override.style.textDecoration) style.textDecoration = override.style.textDecoration as CSSProperties["textDecoration"]
    if (includeGeometry) {
      if (override.style.fontSize) style.fontSize = override.style.fontSize
      if (override.style.fontFamily) style.fontFamily = override.style.fontFamily
      if (override.style.minHeight) style.minHeight = override.style.minHeight
      if (override.style.paddingTop) style.paddingTop = override.style.paddingTop
      if (override.style.paddingBottom) style.paddingBottom = override.style.paddingBottom
    }
  }

  return Object.keys(style).length > 0 ? style : undefined
}

export function resolveTextOverride(node: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!node?.explicitContent) return fallback
  const text = node.content.text?.trim()
  return text ? text : fallback
}

export function resolveHrefOverride(node: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!node?.explicitContent) return fallback
  const href = node.content.href?.trim()
  return href ? href : fallback
}
