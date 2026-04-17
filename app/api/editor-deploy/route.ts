import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "next-sanity"
import { roundLayoutPx } from "@/lib/hero-layout-styles"
import { DEFAULT_NAV_LINKS } from "@/lib/sanity/navigation-loader"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

interface DeployNodePayload {
  id: string
  type: string
  label: string
  isGrouped: boolean
  geometry: { x: number; y: number; width: number; height: number }
  style: {
    color?: string
    backgroundColor?: string
    opacity?: number
    contrast?: number
    saturation?: number
    brightness?: number
    negative?: boolean
    fontSize?: string
    fontFamily?: string
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
    textShadowEnabled?: boolean
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
    textAlign?: "left" | "center" | "right"
    scale?: number
    minHeight?: string
    paddingTop?: string
    paddingBottom?: string
  }
  content: {
    text?: string
    href?: string
    src?: string
    alt?: string
    videoUrl?: string
    mediaKind?: "image" | "video"
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
    accentText?: string
    accentGradientEnabled?: boolean
    accentGradientStart?: string
    accentGradientEnd?: string
    date?: string
    venue?: string
    city?: string
    country?: string
    genre?: string
    price?: string
    status?: string
    time?: string
    capacity?: string
    locationUrl?: string
    extraNodeType?: "text" | "button" | "card" | "overlay"
    parentSection?: string
    label?: string
  }
  explicitContent: boolean
  explicitStyle: boolean
  explicitPosition: boolean
  explicitSize: boolean
}

interface DeployRequestPayload {
  level: "green" | "yellow" | "red"
  diagnosticMode?: boolean
  findings: Array<{ element: string; issue: string; severity: "green" | "yellow" | "red"; blocks: boolean }>
  nodes: DeployNodePayload[]
  allNodes?: DeployNodePayload[]
  changedNodeIds?: string[]
  heroElementStyles?: Record<string, Record<string, unknown>> // { [targetId]: { text?, color?, fontSize?, x?, y?, ... } }
}

interface DeployStepResult {
  step: "checking" | "saving" | "publishing" | "revalidating"
  ok: boolean
  message: string
}

interface NodeVerificationResult {
  storageTarget: string
  expected: Record<string, unknown>
  readBack: Record<string, unknown> | null
  matched: boolean
  mismatchReason: string | null
}

interface DeployEnvDiagnostics {
  SANITY_PROJECT_ID: "yes" | "no"
  NEXT_PUBLIC_SANITY_PROJECT_ID: "yes" | "no"
  SANITY_DATASET: "yes" | "no"
  NEXT_PUBLIC_SANITY_DATASET: "yes" | "no"
  SANITY_API_WRITE_TOKEN: "yes" | "no"
  SANITY_API_TOKEN: "yes" | "no"
}

const ROUTE_VERSION = "sanity-debug-v3-brutal"
const TARGET_SECTION = "hero"
const SANITY_DOC_TYPE = "heroSection"
const SANITY_DOC_NAV = "navigation"
const SANITY_DOC_INTRO = "introBanner"
const SANITY_DOC_LATEST_RELEASE = "latestRelease"
const SANITY_DOC_LIVE_SECTION = "liveSection"
const SANITY_DOC_CONCERT = "concert"
const SANITY_DOC_BAND_MEMBERS = "bandMembersSettings"
const SANITY_DOC_CONTACT = "contactSection"
const SANITY_DOC_FOOTER = "footerSection"
const SANITY_DOC_HOME_EDITOR_STATE = "homeEditorState"
const HOME_EDITOR_STATE_DOCUMENT_ID = "homeEditorState-singleton"
const REVALIDATED_PATH = "/"
const INTRO_DOCUMENT_ID = "introBanner"
const LATEST_RELEASE_DOCUMENT_ID = "latestRelease"
const LIVE_SECTION_DOCUMENT_ID = "liveSection"
const BAND_MEMBERS_DOCUMENT_ID = "bandMembersSettings"
const CONTACT_DOCUMENT_ID = "contactSection"
const FOOTER_DOCUMENT_ID = "footerSection"
const SHOULD_REVALIDATE_PATH = process.env.EDITOR_DEPLOY_REVALIDATE_LOCAL_PATH !== "false"
const PUBLIC_REVALIDATE_URL = process.env.EDITOR_DEPLOY_PUBLIC_REVALIDATE_URL || ""
const PUBLIC_REVALIDATE_SECRET = process.env.EDITOR_DEPLOY_PUBLIC_REVALIDATE_SECRET || ""
const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK || ""

const INTRO_LAYOUT_IDS = new Set([
  "intro-section",
  "intro-banner-gif",
  "intro-banner-text",
  "intro-book-button",
  "intro-press-button",
])

const BAND_MEMBERS_LAYOUT_IDS = new Set([
  "band-members-section",
  "band-members-bg",
  "band-members-header",
  "band-members-header-eyebrow",
  "band-members-header-title",
  "band-members-header-description",
  "member-item-0",
  "member-item-1",
  "member-item-2",
  "member-item-3",
  "member-item-4",
])

const BAND_MEMBER_SUBNODE_FIELDS = new Set(["name", "role", "number", "image"])

const CONTACT_NODE_IDS = new Set([
  "contact-section",
  "contact-bg-image",
  "contact-header",
  "contact-header-eyebrow",
  "contact-header-title",
  "contact-header-description",
  "contact-email",
  "contact-email-title",
  "contact-email-description",
  "contact-email-address",
  "contact-middle-text",
  "contact-telegram",
  "contact-telegram-title",
  "contact-telegram-description",
  "contact-telegram-handle",
])

const FOOTER_SOCIAL_IDS = new Set([
  "footer-social-instagram",
  "footer-social-youtube",
  "footer-social-telegram",
  "footer-social-linktree",
])

const FOOTER_NODE_IDS = new Set([
  "footer-section",
  "footer-logo",
  "footer-description",
  "footer-cta",
  "footer-social-group",
  "footer-divider",
  "footer-copyright",
  ...FOOTER_SOCIAL_IDS,
])

/**
 * Public loaders use `perspective: "published"`. Deploy must patch the **published**
 * document id — never `drafts.*`, or the live site will keep reading stale data while
 * Studio shows edits on the draft layer.
 */
function toPublishedDocumentId(id: string): string {
  return id.startsWith("drafts.") ? id.slice("drafts.".length) : id
}

function isNavLayoutId(id: string): boolean {
  return id === "navigation" || id === "navigation-inner" || id.startsWith("nav-")
}

const NAVBAR_TEXT_NODE_IDS = new Set(["nav-brand-name"])
const NAVBAR_BUTTON_NODE_IDS = new Set(["nav-book-button", "nav-mobile-book-button"])
const NAVBAR_CONTAINER_NODE_IDS = new Set(["navigation-inner"])
const NAVBAR_IMAGE_NODE_IDS = new Set(["nav-logo"])

function isNavbarLinkButtonNodeId(nodeId: string): boolean {
  return /^nav-(?:mobile-)?link-\d+$/.test(nodeId)
}

function isNavbarButtonPatternNodeId(nodeId: string): boolean {
  return NAVBAR_BUTTON_NODE_IDS.has(nodeId) || isNavbarLinkButtonNodeId(nodeId)
}

function isNavbarBoxPatternNodeId(nodeId: string): boolean {
  return NAVBAR_CONTAINER_NODE_IDS.has(nodeId) || isNavbarButtonPatternNodeId(nodeId)
}

const HERO_NODE_IDS = new Set([
  "hero-section",
  "hero-bg-image",
  "hero-title",
  "hero-subtitle",
  "hero-logo",
  "hero-scroll-indicator",
  "hero-scroll-label",
  "hero-buttons",
])

const HERO_TEXT_NODE_IDS = new Set(["hero-title", "hero-subtitle", "hero-scroll-label"])
const HERO_IMAGE_NODE_IDS = new Set(["hero-bg-image", "hero-logo"])
const HERO_IMAGE_FILTER_DEFAULTS = {
  contrast: 100,
  saturation: 100,
  brightness: 100,
  opacity: 1,
  negative: false,
} satisfies Record<"contrast" | "saturation" | "brightness" | "opacity" | "negative", number | boolean>

function mergeHeroImageFilterDefaults(target: Record<string, unknown>): void {
  Object.assign(target, HERO_IMAGE_FILTER_DEFAULTS)
}

function isUsableHeroTextGeometryInput(node: DeployNodePayload): boolean {
  const x = node.geometry?.x
  const y = node.geometry?.y
  const width = node.geometry?.width
  const height = node.geometry?.height

  return (
    HERO_TEXT_NODE_IDS.has(node.id) &&
    typeof x === "number" &&
    typeof y === "number" &&
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    Math.abs(x) <= 2400 &&
    Math.abs(y) <= 900 &&
    width > 1 &&
    height > 1 &&
    width <= 2400 &&
    height <= 800
  )
}

function isUsableHeroTextElementStyle(style: Record<string, unknown>): boolean {
  const x = style.x
  const y = style.y
  const width = style.width
  const height = style.height

  return (
    typeof x === "number" &&
    typeof y === "number" &&
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    Math.abs(x) <= 2400 &&
    Math.abs(y) <= 900 &&
    width > 1 &&
    height > 1 &&
    width <= 2400 &&
    height <= 800
  )
}

const INTRO_NODE_IDS = new Set([
  "intro-section",
  "intro-banner-gif",
  "intro-banner-text",
  "intro-book-button",
  "intro-press-button",
])

const RELEASE_NODE_IDS = new Set([
  "latest-release-section",
  "latest-release-bg",
  "latest-release-card",
  "latest-release-title",
  "latest-release-subtitle",
  "latest-release-watch-button",
  "latest-release-shows-button",
])

const LIVE_STATIC_NODE_IDS = new Set([
  "live-section",
  "live-section-bg-image",
  "live-see-shows-header",
  "live-section-see-shows-button",
  "live-stream-header",
  "live-stream-platforms-group",
  "live-stream-platforms-title",
  "live-social-platforms-group",
  "live-social-platforms-title",
  "live-upcoming-title",
  "live-upcoming-list",
  "live-upcoming-empty",
  "live-upcoming-empty-text",
  "live-history-title",
  "live-history-list",
  "live-history-empty",
  "live-history-empty-text",
])

function isLiveNodeId(id: string): boolean {
  return LIVE_STATIC_NODE_IDS.has(id) || /^live-(?:streaming|social)-/.test(id) || /^live-(?:upcoming|history)-event-\d+(?:-.+)?$/.test(id)
}

function isImageSrcPersistable(src: string): boolean {
  const value = src.trim()
  if (!value) return false
  if (value.startsWith("blob:") || value.startsWith("data:") || value.startsWith("javascript:")) return false
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return true
  return false
}

function parseSanityImageRefFromUrl(src: string, projectId: string, dataset: string): string | null {
  try {
    const url = new URL(src)
    if (url.hostname !== "cdn.sanity.io") return null
    const parts = url.pathname.split("/").filter(Boolean)
    // /images/{projectId}/{dataset}/{fileName.ext}
    if (parts.length < 4) return null
    if (parts[0] !== "images") return null
    if (parts[1] !== projectId) return null
    if (parts[2] !== dataset) return null
    const fileName = parts.slice(3).join("/")
    const extIndex = fileName.lastIndexOf(".")
    if (extIndex <= 0) return null
    const idPart = fileName.slice(0, extIndex).replace(/\//g, "-")
    const extPart = fileName.slice(extIndex + 1)
    if (!idPart || !extPart) return null
    return `image-${idPart}-${extPart}`
  } catch {
    return null
  }
}

function buildSanityImageFieldFromSrc(
  src: string,
  projectId: string,
  dataset: string
): { _type: "image"; asset: { _type: "reference"; _ref: string } } | null {
  const ref = parseSanityImageRefFromUrl(src, projectId, dataset)
  if (!ref) return null
  return {
    _type: "image",
    asset: {
      _type: "reference",
      _ref: ref,
    },
  }
}

function resolveSanityImagePatch(
  nodeId: string,
  src: string,
  projectId: string,
  dataset: string
): {
  imageField: { _type: "image"; asset: { _type: "reference"; _ref: string } } | null
  skippedReason: string | null
} {
  if (!src) return { imageField: null, skippedReason: `${nodeId}:missing-content-src` }
  if (!isImageSrcPersistable(src)) return { imageField: null, skippedReason: `${nodeId}:src(blob/data url)` }

  const imageField = buildSanityImageFieldFromSrc(src, projectId, dataset)
  if (imageField) return { imageField, skippedReason: null }

  if (src.includes("localhost") || src.startsWith("/images/")) {
    return { imageField: null, skippedReason: `${nodeId}:src(local-or-site-path)` }
  }

  return { imageField: null, skippedReason: `${nodeId}:src(non-sanity-cdn url)` }
}

function shouldVerifyInHomeEditorState(node: DeployNodePayload): boolean {
  if (node.id === "intro-banner-gif") return false
  if (RELEASE_NODE_IDS.has(node.id)) return false
  if (isLiveNodeId(node.id)) return false
  if (isBandMembersNodeId(node.id)) return false
  if (CONTACT_NODE_IDS.has(node.id)) return false
  if (FOOTER_NODE_IDS.has(node.id)) return false
  const isImageLikeNode = node.type === "image" || node.type === "background"
  if (isImageLikeNode && node.explicitContent) return true
  if (HERO_NODE_IDS.has(node.id)) return false
  if (isNavLayoutId(node.id)) return false
  if (INTRO_NODE_IDS.has(node.id)) return false
  return node.explicitContent || node.explicitStyle || node.explicitPosition || node.explicitSize
}

function toChangedNodeIds(payload: DeployRequestPayload): string[] {
  if (Array.isArray(payload.changedNodeIds) && payload.changedNodeIds.length > 0) {
    return Array.from(new Set(payload.changedNodeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)))
  }
  return []
}

function markerMatchesNode(marker: string, nodeId: string): boolean {
  return marker === nodeId || marker.startsWith(`${nodeId}:`) || marker.includes(nodeId)
}

function getNodeFailureMarker(nodeId: string, markers: string[]): string | null {
  return markers.find((m) => markerMatchesNode(m, nodeId)) || null
}

function approxEqualNumber(a: unknown, b: unknown): boolean {
  if (typeof a !== "number" || typeof b !== "number") return false
  // Tolerance: 0.5px for browser subpixel rendering, antialiasing, rounding differences
  return Math.abs(a - b) < 0.5
}

function normalizeComparableValue(value: unknown): unknown {
  if (typeof value === "number") return roundLayoutPx(value)
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.parse(JSON.stringify(value))
  return value
}

function normalizeHeroEffectComparableValue(value: unknown): unknown {
  if (typeof value === "number") return Math.round(value * 100) / 100
  return value
}

function valuesMatch(expected: unknown, actual: unknown): boolean {
  if (typeof expected === "number" && typeof actual === "number") {
    return approxEqualNumber(expected, actual)
  }
  if (Array.isArray(expected) || (expected && typeof expected === "object")) {
    return JSON.stringify(expected) === JSON.stringify(actual)
  }
  return expected === actual
}

function compareMaps(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
): { matched: boolean; mismatchReason: string | null } {
  for (const [key, value] of Object.entries(expected)) {
    if (!valuesMatch(value, actual[key])) {
      return {
        matched: false,
        mismatchReason: `mismatch:${key} expected=${JSON.stringify(value)} actual=${JSON.stringify(actual[key])}`,
      }
    }
  }
  return { matched: true, mismatchReason: null }
}

/** Persist brand name, CTA, and link rows from editor nodes (explicitContent). */
function buildNavigationContentPatch(
  nodes: DeployNodePayload[],
  existing: {
    brandName?: string
    links?: Array<{ label: string; href: string }>
    ctaLabel?: string
    ctaHref?: string
  }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const baseLinks = Array.isArray(existing.links) && existing.links.length > 0
    ? existing.links.map((l) => ({ label: l.label || "", href: l.href || "" }))
    : DEFAULT_NAV_LINKS.map((l) => ({ ...l }))
  let linksDirty = false

  for (const node of nodes) {
    if (!node.explicitContent) continue

    if (node.id === "nav-brand-name") {
      const t = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      if (t) patch.brandName = t
      continue
    }

    const linkMatch = /^nav-link-(\d+)$/.exec(node.id)
    const mobileMatch = /^nav-mobile-link-(\d+)$/.exec(node.id)
    const mi = linkMatch ? Number(linkMatch[1]) : mobileMatch ? Number(mobileMatch[1]) : -1
    if (mi >= 0 && mi < baseLinks.length) {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) {
        baseLinks[mi] = { ...baseLinks[mi], label: text }
        linksDirty = true
      }
      if (href) {
        baseLinks[mi] = { ...baseLinks[mi], href }
        linksDirty = true
      }
      continue
    }

    if (node.id === "nav-book-button" || node.id === "nav-mobile-book-button") {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) patch.ctaLabel = text
      if (href) patch.ctaHref = href
    }
  }

  if (linksDirty) patch.links = baseLinks
  return patch
}

function parsePxNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const px = /^([\d.]+)px$/i.exec(value.trim())
  if (px) return Math.round(parseFloat(px[1]))
  return undefined
}

function parseYouTubeId(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed) && !trimmed.includes("/")) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || ""
    }
    const queryId = url.searchParams.get("v")
    if (queryId) return queryId
    const embedMatch = /\/embed\/([^/?#]+)/.exec(url.pathname)
    if (embedMatch?.[1]) return embedMatch[1]
    const thumbnailMatch = /\/vi\/([^/?#]+)/.exec(url.pathname)
    if (thumbnailMatch?.[1]) return thumbnailMatch[1]
  } catch {
    return ""
  }
  return ""
}

/** Map visual-editor `node.style` (color, fontSize, fontWeight) into Sanity elementStyles shape. */
function mergeDeployVisualStyleIntoTarget(target: Record<string, unknown>, node: DeployNodePayload): void {
  if (!node.explicitStyle) return
  const st = node.style as Record<string, unknown>
  if (typeof st.color === "string" && st.color) target.color = st.color
  const fs = parsePxNumber(st.fontSize as string | undefined)
  if (typeof fs === "number") target.fontSize = fs
  const fw = st.fontWeight
  if (fw !== undefined && fw !== "") {
    const n = typeof fw === "number" ? fw : parseInt(String(fw), 10)
    if (!Number.isNaN(n)) target.fontWeight = n
  }
}

function mergeDeployTextEffectsIntoTarget(target: Record<string, unknown>, st: Record<string, unknown>): void {
  if (st.bold === true) target.bold = true
  else if (st.fontWeight !== undefined) target.bold = false

  if (typeof st.italic === "boolean") target.italic = st.italic
  else if (typeof st.fontStyle === "string") target.italic = st.fontStyle === "italic"

  if (typeof st.underline === "boolean") target.underline = st.underline
  else if (typeof st.textDecoration === "string") target.underline = st.textDecoration === "underline"

  if (typeof st.textShadowEnabled === "boolean") target.textShadowEnabled = st.textShadowEnabled
  if (typeof st.gradientEnabled === "boolean") target.gradientEnabled = st.gradientEnabled
  if (typeof st.gradientStart === "string") target.gradientStart = st.gradientStart
  if (typeof st.gradientEnd === "string") target.gradientEnd = st.gradientEnd
}

function parseBandMemberNodeId(nodeId: string): { index: number; field: "name" | "role" | "number" | "image" | null } | null {
  const match = /^member-item-(\d+)(?:-(name|role|number|image))?$/.exec(nodeId)
  if (!match) return null
  const index = Number(match[1])
  if (!Number.isFinite(index)) return null
  const field = match[2]
  return {
    index,
    field: BAND_MEMBER_SUBNODE_FIELDS.has(field) ? field as "name" | "role" | "number" | "image" : null,
  }
}

function isBandMembersNodeId(nodeId: string): boolean {
  return BAND_MEMBERS_LAYOUT_IDS.has(nodeId) || parseBandMemberNodeId(nodeId) !== null
}

function mergeStableElementStyleFromNode(target: Record<string, unknown>, node: DeployNodePayload): void {
  if (node.explicitPosition) {
    target.x = roundLayoutPx(node.geometry.x)
    target.y = roundLayoutPx(node.geometry.y)
  }
  if (node.explicitSize) {
    target.width = roundLayoutPx(node.geometry.width)
    target.height = roundLayoutPx(node.geometry.height)
  }
  const scaleVal = node.style?.scale
  if (node.explicitStyle && typeof scaleVal === "number") {
    target.scale = Math.round(scaleVal * 1000) / 1000
  }
  mergeDeployVisualStyleIntoTarget(target, node)
  if (node.explicitStyle) {
    const st = node.style as Record<string, unknown>
    for (const key of ["opacity", "contrast", "saturation", "brightness", "negative"]) {
      if (st[key] !== undefined && st[key] !== null) target[key] = st[key]
    }
  }
}

function normalizeStoredElementStyles(value: unknown): Record<string, Record<string, unknown>> {
  const parsed = typeof value === "string"
    ? (() => {
        try {
          return JSON.parse(value) as unknown
        } catch {
          return null
        }
      })()
    : value
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

  const result: Record<string, Record<string, unknown>> = {}
  for (const [nodeId, rawStyle] of Object.entries(parsed as Record<string, unknown>)) {
    if (!rawStyle || typeof rawStyle !== "object" || Array.isArray(rawStyle)) continue
    const style = rawStyle as Record<string, unknown>
    const geometry = style.geometry && typeof style.geometry === "object" && !Array.isArray(style.geometry)
      ? style.geometry as Record<string, unknown>
      : null
    const normalized: Record<string, unknown> = {}
    if (geometry) {
      for (const key of ["x", "y", "width", "height"]) {
        if (typeof geometry[key] === "number") normalized[key] = roundLayoutPx(geometry[key] as number)
      }
    }
    for (const [key, entryValue] of Object.entries(style)) {
      if (key !== "geometry") normalized[key] = entryValue
    }
    result[nodeId] = normalized
  }
  return result
}

function buildContactContentPatch(
  nodes: DeployNodePayload[],
  existing: {
    contactMethods?: Array<{ title?: string; description?: string; href?: string; label?: string; contactName?: string }>
  }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const baseMethods = Array.isArray(existing.contactMethods) && existing.contactMethods.length > 0
    ? existing.contactMethods.map((method) => ({
        title: method.title || "",
        description: method.description || "",
        href: method.href || "",
        label: method.label || "",
        contactName: method.contactName || "",
      }))
    : [
        { title: "", description: "", href: "", label: "", contactName: "" },
        { title: "", description: "", href: "", label: "", contactName: "" },
      ]
  while (baseMethods.length < 2) baseMethods.push({ title: "", description: "", href: "", label: "", contactName: "" })
  let methodsDirty = false

  for (const node of nodes) {
    if (!node.explicitContent) continue
    const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
    const href = typeof node.content.href === "string" ? node.content.href.trim() : ""

    if (node.id === "contact-header-eyebrow" && text) patch.eyebrow = text
    if (node.id === "contact-header-title" && text) patch.title = text
    if (node.id === "contact-header-description" && text) patch.description = text
    if (node.id === "contact-middle-text" && text) patch.middleText = text

    if (node.id === "contact-email" && href) {
      baseMethods[0] = { ...baseMethods[0], href }
      methodsDirty = true
    }
    if (node.id === "contact-email-title" && text) {
      baseMethods[0] = { ...baseMethods[0], title: text }
      methodsDirty = true
    }
    if (node.id === "contact-email-description" && text) {
      baseMethods[0] = { ...baseMethods[0], description: text }
      methodsDirty = true
    }
    if (node.id === "contact-email-address" && text) {
      baseMethods[0] = { ...baseMethods[0], label: text }
      if (!baseMethods[0].href || baseMethods[0].href.startsWith("mailto:")) {
        baseMethods[0].href = `mailto:${text}`
      }
      methodsDirty = true
    }

    if (node.id === "contact-telegram" && href) {
      baseMethods[1] = { ...baseMethods[1], href }
      methodsDirty = true
    }
    if (node.id === "contact-telegram-title" && text) {
      baseMethods[1] = { ...baseMethods[1], title: text }
      methodsDirty = true
    }
    if (node.id === "contact-telegram-description" && text) {
      baseMethods[1] = { ...baseMethods[1], description: text }
      methodsDirty = true
    }
    if (node.id === "contact-telegram-handle" && text) {
      baseMethods[1] = { ...baseMethods[1], label: text }
      methodsDirty = true
    }
  }

  if (methodsDirty) patch.contactMethods = baseMethods
  return patch
}

function buildFooterContentPatch(
  nodes: DeployNodePayload[],
  existing: {
    socialLinks?: Array<{ id?: string; name?: string; href?: string }>
  }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const fallbackSocialLinks = [
    { id: "footer-social-instagram", name: "Instagram", href: "https://www.instagram.com/tales4tillerman" },
    { id: "footer-social-youtube", name: "YouTube", href: "https://www.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ" },
    { id: "footer-social-telegram", name: "Telegram", href: "https://t.me/talesforthetillerman" },
    { id: "footer-social-linktree", name: "Linktree", href: "https://linktr.ee/tales4tillerman" },
  ]
  const socialLinks = fallbackSocialLinks.map((fallback, index) => ({
    id: existing.socialLinks?.[index]?.id || fallback.id,
    name: existing.socialLinks?.[index]?.name || fallback.name,
    href: existing.socialLinks?.[index]?.href || fallback.href,
  }))
  let socialDirty = false

  for (const node of nodes) {
    if (!node.explicitContent) continue
    const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
    const href = typeof node.content.href === "string" ? node.content.href.trim() : ""

    if (node.id === "footer-description" && text) patch.description = text
    if (node.id === "footer-copyright" && text) patch.copyright = text.replace(/^©\s*/, "")
    if (node.id === "footer-cta") {
      if (text) patch.ctaLabel = text
      if (href) patch.ctaHref = href
    }

    const socialIndex = socialLinks.findIndex((link) => link.id === node.id)
    if (socialIndex >= 0 && href) {
      socialLinks[socialIndex] = { ...socialLinks[socialIndex], href }
      socialDirty = true
    }
  }

  if (socialDirty) patch.socialLinks = socialLinks
  return patch
}

function buildIntroContentPatch(nodes: DeployNodePayload[]): { patch: Record<string, unknown>; skipped: string[] } {
  const patch: Record<string, unknown> = {}
  const skipped: string[] = []
  for (const node of nodes) {
    if (!node.explicitContent) continue
    if (node.id === "intro-banner-text") {
      const t = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      if (t) patch.bannerText = t
    }
    if (node.id === "intro-banner-gif") {
      const src = typeof node.content?.src === "string" ? node.content.src.trim() : ""
      if (src && isImageSrcPersistable(src)) {
        patch.gifUrl = src
      } else if (src) {
        skipped.push("intro-banner-gif:src(blob/data url)")
      }
    }
    if (node.id === "intro-book-button") {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) patch.bookLabel = text
      if (href) patch.bookHref = href
    }
    if (node.id === "intro-press-button") {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) patch.pressLabel = text
      if (href) patch.pressHref = href
    }
  }
  return { patch, skipped }
}

function buildLatestReleaseContentPatch(
  nodes: DeployNodePayload[],
  existing: {
    ctaButtons?: Array<{ label?: string; href?: string }>
  }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const baseButtons = Array.isArray(existing.ctaButtons) && existing.ctaButtons.length > 0
    ? existing.ctaButtons.map((button) => ({ label: button.label || "", href: button.href || "" }))
    : [
        { label: "", href: "" },
        { label: "", href: "" },
      ]
  while (baseButtons.length < 2) baseButtons.push({ label: "", href: "" })
  let buttonsDirty = false

  for (const node of nodes) {
    if (!node.explicitContent) continue
    if (node.id === "latest-release-title") {
      const title = typeof node.content.text === "string" ? node.content.text.trim() : ""
      if (title) patch.title = title
    }
    if (node.id === "latest-release-subtitle") {
      const subtitle = typeof node.content.text === "string" ? node.content.text.trim() : ""
      if (subtitle) patch.subtitle = subtitle
    }
    if (node.id === "latest-release-bg") {
      const videoSource =
        typeof node.content.videoUrl === "string" && node.content.videoUrl.trim()
          ? node.content.videoUrl
          : typeof node.content.src === "string"
            ? node.content.src
            : ""
      const youtubeId = parseYouTubeId(videoSource)
      if (youtubeId) patch.youtubeId = youtubeId
    }
    if (node.id === "latest-release-watch-button" || node.id === "latest-release-shows-button") {
      const index = node.id === "latest-release-watch-button" ? 0 : 1
      const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content.href === "string" ? node.content.href.trim() : ""
      if (text) {
        baseButtons[index] = { ...baseButtons[index], label: text }
        buttonsDirty = true
      }
      if (href) {
        baseButtons[index] = { ...baseButtons[index], href }
        buttonsDirty = true
      }
    }
  }

  if (buttonsDirty) patch.ctaButtons = baseButtons
  return patch
}

function parseLiveConcertNodeId(nodeId: string): { listType: "upcoming" | "history"; editorId: number; field: string | null } | null {
  const match = /^live-(upcoming|history)-event-(\d+)(?:-(date|venue|city|country|genre|price|time|status|capacity|locationUrl))?$/.exec(nodeId)
  if (!match) return null
  const editorId = Number(match[2])
  if (!Number.isFinite(editorId)) return null
  return {
    listType: match[1] as "upcoming" | "history",
    editorId,
    field: match[3] || null,
  }
}

function normalizeConcertPriceForSanity(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed || /^free$/i.test(trimmed)) return undefined
  const numeric = Number(trimmed.replace(/[^\d.,-]/g, "").replace(",", "."))
  return Number.isFinite(numeric) ? numeric : undefined
}

function collectLiveConcertPatches(nodes: DeployNodePayload[]): Map<number, Record<string, unknown>> {
  const patches = new Map<number, Record<string, unknown>>()
  for (const node of nodes) {
    if (!node.explicitContent) continue
    const parsed = parseLiveConcertNodeId(node.id)
    if (!parsed) continue
    const patch = patches.get(parsed.editorId) || {
      editorId: parsed.editorId,
      status: parsed.listType === "upcoming" ? "Upcoming" : "Completed",
      updatedAt: new Date().toISOString(),
    }
    if (parsed.field) {
      const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content.href === "string" ? node.content.href.trim() : ""
      if (parsed.field === "price") {
        const price = normalizeConcertPriceForSanity(text)
        if (price !== undefined) patch.price = price
      } else if (parsed.field === "locationUrl") {
        if (href || text) patch.ticketUrl = href || text
      } else if (text) {
        patch[parsed.field === "country" ? "country" : parsed.field] = text
      }
    }
    patches.set(parsed.editorId, patch)
  }
  return patches
}

function getEnvDiagnostics(): DeployEnvDiagnostics {
  const sanityProjectId = process.env.SANITY_PROJECT_ID
  const nextPublicSanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const sanityApiWriteToken = process.env.SANITY_API_WRITE_TOKEN
  const sanityApiToken = process.env.SANITY_API_TOKEN

  return {
    SANITY_PROJECT_ID: sanityProjectId ? "yes" : "no",
    NEXT_PUBLIC_SANITY_PROJECT_ID: nextPublicSanityProjectId ? "yes" : "no",
    SANITY_DATASET: process.env.SANITY_DATASET ? "yes" : "no",
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET ? "yes" : "no",
    SANITY_API_WRITE_TOKEN: sanityApiWriteToken ? "yes" : "no",
    SANITY_API_TOKEN: sanityApiToken ? "yes" : "no",
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function triggerPublicRevalidate(log: (msg: string, data?: unknown) => void): Promise<{ attempted: boolean; ok: boolean; message: string }> {
  if (!PUBLIC_REVALIDATE_URL) {
    return { attempted: false, ok: false, message: "Public revalidate URL not configured." }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (PUBLIC_REVALIDATE_SECRET) {
      headers["x-webhook-secret"] = PUBLIC_REVALIDATE_SECRET
      headers.Authorization = `Bearer ${PUBLIC_REVALIDATE_SECRET}`
    }

    const res = await fetch(PUBLIC_REVALIDATE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "editor-deploy",
        path: REVALIDATED_PATH,
        at: new Date().toISOString(),
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      const message = `Public revalidate failed (${res.status}): ${text.slice(0, 240)}`
      log("public revalidate failed", { status: res.status, body: text.slice(0, 240) })
      return { attempted: true, ok: false, message }
    }

    const bodyText = await res.text()
    log("public revalidate success", { status: res.status, body: bodyText.slice(0, 240) })
    return { attempted: true, ok: true, message: "Public site revalidate hook triggered." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    log("public revalidate exception", { message })
    return { attempted: true, ok: false, message: `Public revalidate exception: ${message}` }
  }
}

async function triggerVercelDeploy(log: (msg: string, data?: unknown) => void): Promise<{ attempted: boolean; ok: boolean; message: string }> {
  if (!VERCEL_DEPLOY_HOOK) {
    return { attempted: false, ok: false, message: "Vercel deploy hook not configured." }
  }

  try {
    const res = await fetch(VERCEL_DEPLOY_HOOK, {
      method: "POST",
      cache: "no-store",
    })
    if (!res.ok) {
      const text = await res.text()
      const message = `Vercel deploy hook failed (${res.status}): ${text.slice(0, 240)}`
      log("vercel deploy hook failed", { status: res.status, body: text.slice(0, 240) })
      return { attempted: true, ok: false, message }
    }

    const bodyText = await res.text()
    log("vercel deploy hook success", { status: res.status, body: bodyText.slice(0, 240) })
    return { attempted: true, ok: true, message: "Vercel deploy hook triggered." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    log("vercel deploy hook exception", { message })
    return { attempted: true, ok: false, message: `Vercel deploy hook exception: ${message}` }
  }
}

export async function GET() {
  const envDiagnostics = getEnvDiagnostics()
  return NextResponse.json({
    routeVersion: ROUTE_VERSION,
    publishedDocumentId: "resolved-at-deploy",
    publishedDocumentType: SANITY_DOC_TYPE,
    targetSection: TARGET_SECTION,
    heroTitleMode: "unknown",
    revalidatedPath: REVALIDATED_PATH,
    localRevalidateEnabled: SHOULD_REVALIDATE_PATH,
    publicRevalidateUrlConfigured: !!PUBLIC_REVALIDATE_URL,
    vercelDeployHookConfigured: !!VERCEL_DEPLOY_HOOK,
    diagnostics: envDiagnostics,
    envDiagnostics,
  })
}


/**
 * Normalize title segments for comparison, ignoring _key and non-render fields.
 * Only compares: text, color, bold, italic, underline, opacity, textShadowEnabled, gradientEnabled, gradientStart, gradientEnd
 */
function normalizeTitleSegments(segments: unknown[]): Array<{
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  opacity?: number
  textShadowEnabled?: boolean
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
}> {
  if (!Array.isArray(segments)) return []
  
  return segments
    .filter((seg) => seg && typeof seg === "object")
    .map((seg) => {
      const s = seg as Record<string, unknown>
      return {
        text: typeof s.text === "string" ? s.text.trim() : "",
        color: typeof s.color === "string" ? s.color : undefined,
        bold: typeof s.bold === "boolean" ? s.bold : undefined,
        italic: typeof s.italic === "boolean" ? s.italic : undefined,
        underline: typeof s.underline === "boolean" ? s.underline : undefined,
        opacity: typeof s.opacity === "number" ? s.opacity : undefined,
        textShadowEnabled: typeof s.textShadowEnabled === "boolean" ? s.textShadowEnabled : undefined,
        gradientEnabled: typeof s.gradientEnabled === "boolean" ? s.gradientEnabled : undefined,
        gradientStart: typeof s.gradientStart === "string" ? s.gradientStart : undefined,
        gradientEnd: typeof s.gradientEnd === "string" ? s.gradientEnd : undefined,
      }
    })
    .filter((seg) => seg.text.length > 0) // remove empty segments
}


export async function POST(request: Request) {
  const startTime = Date.now()
  const log = (msg: string, data?: unknown) => {
    const elapsed = Date.now() - startTime
    console.log(`[editor-deploy ${elapsed}ms] ${msg}`, data ? JSON.stringify(data, null, 2) : "")
  }

  try {
    const payload = (await request.json()) as DeployRequestPayload
    log("payload received", { nodeCount: payload.nodes.length, level: payload.level })
    const sanityProjectId = process.env.SANITY_PROJECT_ID
    const nextPublicSanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const projectId = sanityProjectId || nextPublicSanityProjectId
    const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
    const sanityApiWriteToken = process.env.SANITY_API_WRITE_TOKEN
    const sanityApiToken = process.env.SANITY_API_TOKEN
    const sanityToken = sanityApiWriteToken || sanityApiToken
    const diagnostics = getEnvDiagnostics()
    const envDiagnostics = diagnostics

    log("environment", { projectId: projectId ? "set" : "missing", dataset, writeToken: sanityToken ? "set" : "missing" })

    const heroTitleNode = payload.nodes.find((node) => node.id === "hero-title" && node.type === "text")
    const heroSubtitleNode = payload.nodes.find((node) => node.id === "hero-subtitle" && node.type === "text")
    const heroScrollLabelNode = payload.nodes.find((node) => node.id === "hero-scroll-label" && node.type === "text")

    const steps: DeployStepResult[] = [{
      step: "checking",
      ok: true,
      message: "Endpoint reached: /api/editor-deploy.",
    }]

    steps.push({
      step: "checking",
      ok: true,
      message: `Env diagnostics (server-side): SANITY_PROJECT_ID: ${diagnostics.SANITY_PROJECT_ID}; NEXT_PUBLIC_SANITY_PROJECT_ID: ${diagnostics.NEXT_PUBLIC_SANITY_PROJECT_ID}; SANITY_DATASET: ${diagnostics.SANITY_DATASET}; NEXT_PUBLIC_SANITY_DATASET: ${diagnostics.NEXT_PUBLIC_SANITY_DATASET}; SANITY_API_WRITE_TOKEN: ${diagnostics.SANITY_API_WRITE_TOKEN}; SANITY_API_TOKEN: ${diagnostics.SANITY_API_TOKEN}; dataset value used: ${dataset}.`,
    })

    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.findings) || !payload.level) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload"], diagnostics, envDiagnostics }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload: nodes array is empty.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload.nodes"], diagnostics, envDiagnostics }, { status: 400 })
    }
    const changedNodeIds = toChangedNodeIds(payload)
    const changedNodeSet = new Set(changedNodeIds)
    const payloadNodeById = new Map(payload.nodes.map((node) => [node.id, node]))

    if (!projectId) {
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "checking",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: missing project id. Set SANITY_PROJECT_ID (preferred) or NEXT_PUBLIC_SANITY_PROJECT_ID.",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: "resolved-at-deploy",
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode: "unknown",
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes: [],
          skippedNodes: [],
          failedNodes: ["sanity-project-id"],
          diagnostics,
          envDiagnostics,
        },
        { status: 500 }
      )
    }

    if (!sanityToken) {
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "checking",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: missing write token. Set SANITY_API_WRITE_TOKEN or fallback SANITY_API_TOKEN.",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: "resolved-at-deploy",
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode: "unknown",
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes: [],
          skippedNodes: [],
          failedNodes: ["sanity-token"],
          diagnostics,
          envDiagnostics,
        },
        { status: 500 }
      )
    }

    const writeClient = createClient({
      projectId,
      dataset,
      apiVersion: "2024-01-01",
      useCdn: false,
      token: sanityToken,
      /** Must match loaders (`perspective: "published"`) so patches hit what the public site reads. */
      perspective: "published",
    })

    const [existingHero, existingNavigation, existingIntro, existingLatestRelease, existingLiveSection, existingContact, existingFooter] = await Promise.all([
      writeClient.fetch<{
        _id: string
        title?: string
        titleHighlight?: string
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(`*[_type == $type][0]{ _id, title, titleHighlight, elementStyles }`, { type: SANITY_DOC_TYPE }),
      writeClient.fetch<{
        _id: string
        brandName?: string
        links?: Array<{ label: string; href: string }>
        ctaLabel?: string
        ctaHref?: string
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(`*[_type == $navType][0]{ _id, brandName, links[]{ label, href }, ctaLabel, ctaHref, elementStyles }`, {
        navType: SANITY_DOC_NAV,
      }),
      writeClient.fetch<{
        _id: string
        bannerText?: string
        gifUrl?: string
        bookLabel?: string
        bookHref?: string
        pressLabel?: string
        pressHref?: string
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(
        `*[_type == $introType][0]{ _id, bannerText, gifUrl, bookLabel, bookHref, pressLabel, pressHref, elementStyles }`,
        { introType: SANITY_DOC_INTRO }
      ),
      writeClient.fetch<{
        _id: string
        title?: string
        subtitle?: string
        youtubeId?: string
        ctaButtons?: Array<{ label?: string; href?: string }>
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(
        `*[_type == $releaseType][0]{ _id, title, subtitle, youtubeId, ctaButtons[]{ label, href }, elementStyles }`,
        { releaseType: SANITY_DOC_LATEST_RELEASE }
      ),
      writeClient.fetch<{
        _id: string
        elementStyles?: Record<string, Record<string, unknown>>
        backgroundImage?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $liveType][0]{ _id, elementStyles, backgroundImage{asset->{_id}} }`,
        { liveType: SANITY_DOC_LIVE_SECTION }
      ),
      writeClient.fetch<{
        _id: string
        eyebrow?: string
        title?: string
        description?: string
        middleText?: string
        contactMethods?: Array<{ title?: string; description?: string; href?: string; label?: string; contactName?: string }>
        elementStyles?: Record<string, Record<string, unknown>>
        backgroundImage?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $contactType][0]{ _id, eyebrow, title, description, middleText, contactMethods[]{ title, description, href, label, contactName }, elementStyles, backgroundImage{asset->{_id}} }`,
        { contactType: SANITY_DOC_CONTACT }
      ),
      writeClient.fetch<{
        _id: string
        logo?: { asset?: { _ref?: string; _id?: string } }
        logoAlt?: string
        description?: string
        ctaLabel?: string
        ctaHref?: string
        copyright?: string
        socialLinks?: Array<{ id?: string; name?: string; href?: string }>
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(
        `*[_type == $footerType][0]{ _id, logo{asset->{_id}}, logoAlt, description, ctaLabel, ctaHref, copyright, socialLinks[]{ id, name, href }, elementStyles }`,
        { footerType: SANITY_DOC_FOOTER }
      ),
    ])
    log("document fetch", { hero: !!existingHero?._id, navigation: !!existingNavigation?._id, intro: !!existingIntro?._id, latestRelease: !!existingLatestRelease?._id, live: !!existingLiveSection?._id, contact: !!existingContact?._id, footer: !!existingFooter?._id })
    // Determine mode: "segmented" if hero-title node exists and is editable, else "legacy"
    const heroTitleMode: "legacy" | "segmented" = heroTitleNode?.explicitContent ? "segmented" : "legacy"

    if (!existingHero?._id) {
      steps.push({ step: "saving", ok: false, message: "Hero section document not found; refusing to create implicit duplicate." })
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "saving",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: heroSection document not found.",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: "resolved-at-deploy",
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode,
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes: [],
          skippedNodes: [],
          failedNodes: ["hero-section-document"],
          persistedFields: [],
          skippedFields: ["hero-logo", "hero-scroll-indicator", "hero-geometry"],
          diagnostics,
          envDiagnostics,
        },
        { status: 500 }
      )
    }

    const persistedFields: string[] = []
    const skippedFields: string[] = []
    const persistedNodes: string[] = []
    const skippedNodes: string[] = []
    let elementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const navElementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const introElementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const releaseElementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const liveElementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const failedNodes: string[] = []
    const heroPatch: Record<string, unknown> = {}

    if (heroTitleNode?.explicitContent) {
      // New generation: hero-title is a single text node
      const heroTitleText = typeof heroTitleNode?.content?.text === "string" ? heroTitleNode.content.text.trim() : ""
      if (heroTitleText) {
        heroPatch.title = heroTitleText
        // Clear titleHighlight residual from old Group Editor (prevent confusion from stale data)
        heroPatch.titleHighlight = ""
        if (!persistedFields.includes("title")) persistedFields.push("title")
        if (!persistedFields.includes("titleHighlight")) persistedFields.push("titleHighlight")
        if (!persistedNodes.includes("hero-title")) persistedNodes.push("hero-title")
      }
    }

    if (heroSubtitleNode?.explicitContent) {
      const heroSubtitleText = typeof heroSubtitleNode.content?.text === "string" ? heroSubtitleNode.content.text.trim() : ""
      if (heroSubtitleText) {
        heroPatch.subtitle = heroSubtitleText
        persistedFields.push("subtitle")
        persistedNodes.push("hero-subtitle")
      } else {
        skippedFields.push("subtitle")
        failedNodes.push("hero-subtitle-empty")
      }
    }

    const heroButtonsNode = payload.nodes.find((node) => node.id === "hero-buttons")
    if (heroButtonsNode?.explicitContent) {
      const buttons: Array<{ label: string; href: string; variant: string }> = []
      for (let i = 0; i < 2; i++) {
        const btnTextNode = payload.nodes.find((n) => n.id === `hero-button-${i + 1}`)
        const btnHrefNode = payload.nodes.find((n) => n.id === `hero-button-${i + 1}-href`)
        const btnText = btnTextNode?.explicitContent ? (typeof btnTextNode.content?.text === "string" ? btnTextNode.content.text.trim() : "") : ""
        const btnHref = btnHrefNode?.explicitContent ? (typeof btnHrefNode.content?.href === "string" ? btnHrefNode.content.href.trim() : "") : ""
        if (btnText) {
          buttons.push({ label: btnText, href: btnHref, variant: i === 0 ? "primary" : "secondary" })
        }
      }
      if (buttons.length > 0) {
        heroPatch.ctaButtons = buttons
        if (!persistedFields.includes("ctaButtons")) persistedFields.push("ctaButtons")
        if (!persistedNodes.includes("hero-buttons")) persistedNodes.push("hero-buttons")
      }
    }

    const heroScrollNode = payload.nodes.find((node) => node.id === "hero-scroll-indicator")
    const explicitHeroScrollTextNode = heroScrollLabelNode?.explicitContent ? heroScrollLabelNode : heroScrollNode?.explicitContent ? heroScrollNode : null
    if (explicitHeroScrollTextNode) {
      const scrollText = typeof explicitHeroScrollTextNode.content?.text === "string" ? explicitHeroScrollTextNode.content.text.trim() : ""
      if (scrollText) {
        heroPatch.scrollLabel = scrollText
        if (!persistedFields.includes("scrollLabel")) persistedFields.push("scrollLabel")
        if (!persistedNodes.includes(explicitHeroScrollTextNode.id)) persistedNodes.push(explicitHeroScrollTextNode.id)
      }
    }

    // Doc-driven image writers: keep these nodes out of homeEditorState and persist directly
    // into the same Sanity docs consumed by loaders.
    const heroBgImageNode = payload.nodes.find((node) => node.id === "hero-bg-image")
    if (heroBgImageNode?.explicitContent) {
      const src = typeof heroBgImageNode.content?.src === "string" ? heroBgImageNode.content.src.trim() : ""
      const { imageField, skippedReason } = resolveSanityImagePatch("hero-bg-image", src, projectId, dataset)
      if (skippedReason) {
        skippedNodes.push(skippedReason)
      } else if (imageField) {
        heroPatch.backgroundImage = imageField
        elementStylesInPayload["hero-bg-image"] = { ...(elementStylesInPayload["hero-bg-image"] || {}) }
        mergeHeroImageFilterDefaults(elementStylesInPayload["hero-bg-image"])
        if (!persistedFields.includes("backgroundImage")) persistedFields.push("backgroundImage")
        if (!persistedNodes.includes("hero-bg-image")) persistedNodes.push("hero-bg-image")
      }
    }

    const heroLogoNode = payload.nodes.find((node) => node.id === "hero-logo")
    if (heroLogoNode?.explicitContent) {
      const src = typeof heroLogoNode.content?.src === "string" ? heroLogoNode.content.src.trim() : ""
      const { imageField, skippedReason } = resolveSanityImagePatch("hero-logo", src, projectId, dataset)
      if (skippedReason) {
        skippedNodes.push(skippedReason)
      } else if (imageField) {
        heroPatch.logo = imageField
        elementStylesInPayload["hero-logo"] = { ...(elementStylesInPayload["hero-logo"] || {}) }
        mergeHeroImageFilterDefaults(elementStylesInPayload["hero-logo"])
        if (!persistedFields.includes("logo")) persistedFields.push("logo")
        if (!persistedNodes.includes("hero-logo")) persistedNodes.push("hero-logo")
      }
    }

    /** Persist layout (translate/scale/size) for every hero block the visual editor can move — same as logo/title. */
    const HERO_LAYOUT_IDS = new Set([
      "hero-section",
      "hero-bg-image",
      "hero-title",
      "hero-subtitle",
      "hero-logo",
      "hero-scroll-indicator",
      "hero-scroll-label",
      "hero-buttons",
    ])

    for (const node of payload.nodes) {
      if (!HERO_LAYOUT_IDS.has(node.id)) continue
      const isHeroTextNode = HERO_TEXT_NODE_IDS.has(node.id)
      const hasUsableHeroTextGeometry = isHeroTextNode && isUsableHeroTextGeometryInput(node)
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number" && (!isHeroTextNode || hasUsableHeroTextGeometry)
      if (!node.explicitPosition && !node.explicitSize && !hasScale && !node.explicitStyle) continue

      elementStylesInPayload[node.id] = { ...(elementStylesInPayload[node.id] || {}) }
      const s = elementStylesInPayload[node.id] as Record<string, unknown>
      if ((!isHeroTextNode || hasUsableHeroTextGeometry) && node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if ((!isHeroTextNode || hasUsableHeroTextGeometry) && node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000

      if (node.explicitStyle) {
        const st = node.style as Record<string, unknown>
        // Image/background effects
        if (HERO_IMAGE_NODE_IDS.has(node.id)) {
          if (typeof st.contrast === "number") s.contrast = Math.round(st.contrast * 100) / 100
          if (typeof st.saturation === "number") s.saturation = Math.round(st.saturation * 100) / 100
          if (typeof st.brightness === "number") s.brightness = Math.round(st.brightness * 100) / 100
          if (typeof st.negative === "boolean") s.negative = st.negative
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
        }
        // Hero text pattern: content lives in heroSection fields; visual text styles live in elementStyles.
        if (HERO_TEXT_NODE_IDS.has(node.id)) {
          mergeDeployVisualStyleIntoTarget(s, node)
          mergeDeployTextEffectsIntoTarget(s, st)
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
        }
        // Navigation card opacity
        if (node.id === "navigation-inner") {
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
        }
      }

      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    for (const node of payload.nodes) {
      if (!isNavLayoutId(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      if (!node.explicitPosition && !node.explicitSize && !hasScale && !node.explicitStyle) continue

      navElementStylesInPayload[node.id] = { ...(navElementStylesInPayload[node.id] || {}) }
      const s = navElementStylesInPayload[node.id] as Record<string, unknown>
      if (node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if (node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000

      if (node.explicitStyle) {
        const st = node.style as Record<string, unknown>
        // Navbar text pattern: content lives in navigation fields; visual text styles live in elementStyles.
        if (NAVBAR_TEXT_NODE_IDS.has(node.id)) {
          if (typeof st.color === "string") s.color = st.color
          if (typeof st.fontSize === "string") s.fontSize = st.fontSize
          if (typeof st.fontWeight === "string" || typeof st.fontWeight === "number") s.fontWeight = st.fontWeight
          mergeDeployTextEffectsIntoTarget(s, st)
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
        }
        // Navbar logo/image pattern: source lives in navigation.brandLogo; filters/layout live in elementStyles.
        if (NAVBAR_IMAGE_NODE_IDS.has(node.id)) {
          if (typeof st.contrast === "number") s.contrast = Math.round(st.contrast * 100) / 100
          if (typeof st.saturation === "number") s.saturation = Math.round(st.saturation * 100) / 100
          if (typeof st.brightness === "number") s.brightness = Math.round(st.brightness * 100) / 100
          if (st.negative === true) s.negative = true
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
        }
        // Navbar button pattern: text/link content lives in navigation fields; visual box styles live in elementStyles.
        if (isNavbarButtonPatternNodeId(node.id)) {
          mergeDeployVisualStyleIntoTarget(s, node)
          mergeDeployTextEffectsIntoTarget(s, st)
        }
        // Navbar container/button box pattern: backgroundColor includes alpha for exterior-only opacity.
        if (isNavbarBoxPatternNodeId(node.id) && typeof st.backgroundColor === "string") {
          s.backgroundColor = st.backgroundColor
        }
      }

      log("nav layout captured", { id: node.id, x: s.x, y: s.y, w: s.width, h: s.height, scale: s.scale })
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    for (const node of payload.nodes) {
      if (!INTRO_LAYOUT_IDS.has(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      const hasLayout = node.explicitPosition || node.explicitSize || hasScale
      if (!hasLayout && !node.explicitStyle) continue

      introElementStylesInPayload[node.id] = { ...(introElementStylesInPayload[node.id] || {}) }
      const s = introElementStylesInPayload[node.id] as Record<string, unknown>
      if (node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if (node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000
      if (node.explicitStyle) mergeDeployVisualStyleIntoTarget(s, node)
      log("intro layout captured", { id: node.id, x: s.x, y: s.y, w: s.width, h: s.height, scale: s.scale })
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    for (const node of payload.nodes) {
      if (!RELEASE_NODE_IDS.has(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      const hasLayout = node.explicitPosition || node.explicitSize || hasScale
      if (!hasLayout && !node.explicitStyle) continue

      releaseElementStylesInPayload[node.id] = { ...(releaseElementStylesInPayload[node.id] || {}) }
      const s = releaseElementStylesInPayload[node.id] as Record<string, unknown>
      if (node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if (node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000
      if (node.explicitStyle) {
        mergeDeployVisualStyleIntoTarget(s, node)
        const st = node.style as Record<string, unknown>
        if (node.id === "latest-release-bg") {
          if (typeof st.contrast === "number") s.contrast = Math.round(st.contrast * 100) / 100
          if (typeof st.saturation === "number") s.saturation = Math.round(st.saturation * 100) / 100
          if (typeof st.brightness === "number") s.brightness = Math.round(st.brightness * 100) / 100
          if (st.negative === true) s.negative = true
        }
        if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
      }
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    for (const node of payload.nodes) {
      if (!isLiveNodeId(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      const hasLayout = node.explicitPosition || node.explicitSize || hasScale
      if (!hasLayout && !node.explicitStyle) continue

      liveElementStylesInPayload[node.id] = { ...(liveElementStylesInPayload[node.id] || {}) }
      const s = liveElementStylesInPayload[node.id] as Record<string, unknown>
      if (node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if (node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000
      if (node.explicitStyle) {
        mergeDeployVisualStyleIntoTarget(s, node)
        const st = node.style as Record<string, unknown>
        if (node.id === "live-section-bg-image") {
          if (typeof st.contrast === "number") s.contrast = Math.round(st.contrast * 100) / 100
          if (typeof st.saturation === "number") s.saturation = Math.round(st.saturation * 100) / 100
          if (typeof st.brightness === "number") s.brightness = Math.round(st.brightness * 100) / 100
          if (st.negative === true) s.negative = true
        }
        if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
      }
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    let mergedNavigationElementStyles: Record<string, unknown> | null = null
    if (Object.keys(navElementStylesInPayload).length > 0 && existingNavigation?._id) {
      const priorRaw = existingNavigation.elementStyles
      const prior =
        priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw) ? { ...priorRaw } : {}
      mergedNavigationElementStyles = { ...prior }
      for (const [targetId, incoming] of Object.entries(navElementStylesInPayload)) {
        if (typeof incoming === "object" && incoming !== null) {
          const prevTarget =
            mergedNavigationElementStyles[targetId] && typeof mergedNavigationElementStyles[targetId] === "object"
              ? (mergedNavigationElementStyles[targetId] as Record<string, unknown>)
              : {}
          mergedNavigationElementStyles[targetId] = { ...prevTarget, ...(incoming as Record<string, unknown>) }
        }
      }
      log("navigation element styles merged", { targets: Object.keys(mergedNavigationElementStyles) })
    }

    let mergedIntroElementStyles: Record<string, unknown> | null = null
    if (Object.keys(introElementStylesInPayload).length > 0) {
      const priorRaw = existingIntro?.elementStyles
      const prior =
        priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw) ? { ...priorRaw } : {}
      mergedIntroElementStyles = { ...prior }
      for (const [targetId, incoming] of Object.entries(introElementStylesInPayload)) {
        if (typeof incoming === "object" && incoming !== null) {
          const prevTarget =
            mergedIntroElementStyles[targetId] && typeof mergedIntroElementStyles[targetId] === "object"
              ? (mergedIntroElementStyles[targetId] as Record<string, unknown>)
              : {}
          mergedIntroElementStyles[targetId] = { ...prevTarget, ...(incoming as Record<string, unknown>) }
        }
      }
      log("intro element styles merged", { targets: Object.keys(mergedIntroElementStyles) })
    }

    let mergedReleaseElementStyles: Record<string, unknown> | null = null
    if (Object.keys(releaseElementStylesInPayload).length > 0) {
      const priorRaw = existingLatestRelease?.elementStyles
      const prior =
        priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw) ? { ...priorRaw } : {}
      mergedReleaseElementStyles = { ...prior }
      for (const [targetId, incoming] of Object.entries(releaseElementStylesInPayload)) {
        if (typeof incoming === "object" && incoming !== null) {
          const prevTarget =
            mergedReleaseElementStyles[targetId] && typeof mergedReleaseElementStyles[targetId] === "object"
              ? (mergedReleaseElementStyles[targetId] as Record<string, unknown>)
              : {}
          mergedReleaseElementStyles[targetId] = { ...prevTarget, ...(incoming as Record<string, unknown>) }
        }
      }
      log("latest release element styles merged", { targets: Object.keys(mergedReleaseElementStyles) })
    }

    let mergedLiveElementStyles: Record<string, unknown> | null = null
    if (Object.keys(liveElementStylesInPayload).length > 0) {
      const priorRaw = existingLiveSection?.elementStyles
      const prior =
        priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw) ? { ...priorRaw } : {}
      mergedLiveElementStyles = { ...prior }
      for (const [targetId, incoming] of Object.entries(liveElementStylesInPayload)) {
        if (typeof incoming === "object" && incoming !== null) {
          const prevTarget =
            mergedLiveElementStyles[targetId] && typeof mergedLiveElementStyles[targetId] === "object"
              ? (mergedLiveElementStyles[targetId] as Record<string, unknown>)
              : {}
          mergedLiveElementStyles[targetId] = { ...prevTarget, ...(incoming as Record<string, unknown>) }
        }
      }
      log("live element styles merged", { targets: Object.keys(mergedLiveElementStyles) })
    }

    const navContentPatch = existingNavigation?._id
      ? buildNavigationContentPatch(payload.nodes, {
          brandName: existingNavigation.brandName,
          links: existingNavigation.links,
          ctaLabel: existingNavigation.ctaLabel,
          ctaHref: existingNavigation.ctaHref,
        })
      : {}
    const navImagePatch: Record<string, unknown> = {}
    const navLogoNode = payload.nodes.find((node) => node.id === "nav-logo")
    if (navLogoNode?.explicitContent) {
      const src = typeof navLogoNode.content?.src === "string" ? navLogoNode.content.src.trim() : ""
      if (!src) {
        skippedNodes.push("nav-logo:missing-content-src")
      } else if (!isImageSrcPersistable(src)) {
        skippedNodes.push("nav-logo:src(blob/data url)")
      } else {
        const imageField = buildSanityImageFieldFromSrc(src, projectId, dataset)
        if (!imageField) {
          skippedNodes.push("nav-logo:src(non-sanity-cdn url)")
        } else {
          navImagePatch.brandLogo = imageField
          if (!persistedFields.includes("brandLogo")) persistedFields.push("brandLogo")
          if (!persistedNodes.includes("nav-logo")) persistedNodes.push("nav-logo")
        }
      }
    }

    const hasNavLayout =
      mergedNavigationElementStyles !== null && Object.keys(mergedNavigationElementStyles).length > 0
    const hasNavContent = Object.keys(navContentPatch).length > 0 || Object.keys(navImagePatch).length > 0

    let navigationDocumentId: string | null = null
    if (existingNavigation?._id && (hasNavLayout || hasNavContent)) {
      const setPayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (hasNavLayout) setPayload.elementStyles = mergedNavigationElementStyles
      Object.assign(setPayload, navContentPatch)
      Object.assign(setPayload, navImagePatch)
      const navPatchResponse = await writeClient.patch(toPublishedDocumentId(existingNavigation._id)).set(setPayload).commit()
      navigationDocumentId = navPatchResponse._id
      log("navigation patch committed", { docId: navigationDocumentId, hasNavLayout, hasNavContent, setPayload })
      const navParts: string[] = []
      if (hasNavLayout) navParts.push("layout")
      if (hasNavContent) navParts.push("content")
      steps.push({
        step: "saving",
        ok: true,
        message: `Navigation ${navParts.join(" + ")} saved: ${existingNavigation._id}`,
      })
      if (hasNavLayout) {
        persistedFields.push("navigation.elementStyles")
        for (const nodeId of Object.keys(mergedNavigationElementStyles || {})) {
          if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
        }
      }
      if (hasNavContent) {
        for (const node of payload.nodes) {
          if (!node.explicitContent) continue
          if (
            node.id === "nav-brand-name" ||
            node.id === "nav-logo" ||
            node.id === "nav-book-button" ||
            node.id === "nav-mobile-book-button" ||
            /^nav-(link|mobile-link)-\d+$/.test(node.id)
          ) {
            if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
          }
        }
        for (const k of Object.keys(navContentPatch)) {
          if (!persistedFields.includes(k)) persistedFields.push(k)
        }
      }
    }

    const introContentResult: { patch: Record<string, unknown>; skipped: string[] } = existingIntro?._id
      ? buildIntroContentPatch(payload.nodes)
      : { patch: {}, skipped: [] }
    const introContentPatch = introContentResult.patch
    const hasIntroLayout =
      mergedIntroElementStyles !== null && Object.keys(mergedIntroElementStyles).length > 0
    const hasIntroContent = Object.keys(introContentPatch).length > 0

    let introDocumentId: string | null = null
    if (existingIntro?._id && (hasIntroLayout || hasIntroContent)) {
      const introSetPayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (hasIntroLayout) introSetPayload.elementStyles = mergedIntroElementStyles
      Object.assign(introSetPayload, introContentPatch)
      const introPatchResponse = await writeClient.patch(toPublishedDocumentId(existingIntro._id)).set(introSetPayload).commit()
      introDocumentId = introPatchResponse._id
      log("intro patch committed", { docId: introDocumentId, hasIntroLayout, hasIntroContent })
      const introParts: string[] = []
      if (hasIntroLayout) introParts.push("layout")
      if (hasIntroContent) introParts.push("content")
      steps.push({
        step: "saving",
        ok: true,
        message: `Intro banner ${introParts.join(" + ")} saved: ${existingIntro._id}`,
      })
      if (hasIntroContent) {
        for (const node of payload.nodes) {
          if (!node.explicitContent) continue
          if (
            node.id === "intro-banner-text" ||
            node.id === "intro-banner-gif" ||
            node.id === "intro-book-button" ||
            node.id === "intro-press-button"
          ) {
            if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
          }
        }
        for (const k of Object.keys(introContentPatch)) {
          if (!persistedFields.includes(k)) persistedFields.push(k)
        }
      }

    }
    if (!existingIntro?._id && (hasIntroLayout || hasIntroContent)) {
      const introCreatePayload: Record<string, unknown> & { _id: string; _type: string } = {
        _id: INTRO_DOCUMENT_ID,
        _type: SANITY_DOC_INTRO,
        updatedAt: new Date().toISOString(),
      }
      if (hasIntroLayout) introCreatePayload.elementStyles = mergedIntroElementStyles
      Object.assign(introCreatePayload, introContentPatch)
      const introCreateResponse = await writeClient.createOrReplace(introCreatePayload)
      introDocumentId = introCreateResponse._id
      steps.push({
        step: "saving",
        ok: true,
        message: `Intro banner document created: ${introDocumentId}`,
      })
    }

    if (introContentResult.skipped.length > 0) {
      skippedFields.push(...introContentResult.skipped)
      if (!skippedNodes.includes("intro-banner-gif")) skippedNodes.push("intro-banner-gif")
    }

    const releaseContentPatch = buildLatestReleaseContentPatch(payload.nodes, {
      ctaButtons: existingLatestRelease?.ctaButtons,
    })
    const hasReleaseLayout =
      mergedReleaseElementStyles !== null && Object.keys(mergedReleaseElementStyles).length > 0
    const hasReleaseContent = Object.keys(releaseContentPatch).length > 0

    let latestReleaseDocumentId: string | null = null
    if (existingLatestRelease?._id && (hasReleaseLayout || hasReleaseContent)) {
      const releaseSetPayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (hasReleaseLayout) releaseSetPayload.elementStyles = mergedReleaseElementStyles
      Object.assign(releaseSetPayload, releaseContentPatch)
      const releasePatchResponse = await writeClient
        .patch(toPublishedDocumentId(existingLatestRelease._id))
        .set(releaseSetPayload)
        .commit()
      latestReleaseDocumentId = releasePatchResponse._id
      const releaseParts: string[] = []
      if (hasReleaseLayout) releaseParts.push("layout")
      if (hasReleaseContent) releaseParts.push("content")
      steps.push({
        step: "saving",
        ok: true,
        message: `Latest Release ${releaseParts.join(" + ")} saved: ${existingLatestRelease._id}`,
      })
    }
    if (!existingLatestRelease?._id && (hasReleaseLayout || hasReleaseContent)) {
      const releaseCreatePayload: Record<string, unknown> & { _id: string; _type: string } = {
        _id: LATEST_RELEASE_DOCUMENT_ID,
        _type: SANITY_DOC_LATEST_RELEASE,
        title: "Latest Release",
        subtitle: "Fresh groove, built for live stages and late-night playlists.",
        youtubeId: "xofflmVqYGs",
        ctaButtons: [
          { label: "Stream the New Single", href: "https://open.spotify.com/intl-es/artist/0FHjK3O0k8HQMrJsF7KQwF" },
          {
            label: "See Upcoming Shows",
            href: "https://www.bandsintown.com/e/108124718-tales-for-the-tillerman-at-mauerpark?came_from=250&utm_medium=web&utm_source=artist_page&utm_campaign=search_bar",
          },
        ],
        updatedAt: new Date().toISOString(),
      }
      if (hasReleaseLayout) releaseCreatePayload.elementStyles = mergedReleaseElementStyles
      Object.assign(releaseCreatePayload, releaseContentPatch)
      const releaseCreateResponse = await writeClient.createOrReplace(releaseCreatePayload)
      latestReleaseDocumentId = releaseCreateResponse._id
      steps.push({
        step: "saving",
        ok: true,
        message: `Latest Release document created: ${latestReleaseDocumentId}`,
      })
    }
    if (hasReleaseLayout) {
      if (!persistedFields.includes("latestRelease.elementStyles")) persistedFields.push("latestRelease.elementStyles")
      for (const nodeId of Object.keys(mergedReleaseElementStyles || {})) {
        if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
      }
    }
    if (hasReleaseContent) {
      for (const node of payload.nodes) {
        if (!node.explicitContent || !RELEASE_NODE_IDS.has(node.id)) continue
        if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
      }
      for (const k of Object.keys(releaseContentPatch)) {
        if (!persistedFields.includes(k)) persistedFields.push(k)
      }
    }

    const liveSectionPatch: Record<string, unknown> = {}
    const liveBgNode = payload.nodes.find((node) => node.id === "live-section-bg-image")
    if (liveBgNode?.explicitContent) {
      const src = typeof liveBgNode.content?.src === "string" ? liveBgNode.content.src.trim() : ""
      const { imageField, skippedReason } = resolveSanityImagePatch("live-section-bg-image", src, projectId, dataset)
      if (skippedReason) {
        skippedNodes.push(skippedReason)
      } else if (imageField) {
        liveSectionPatch.backgroundImage = imageField
        if (!persistedFields.includes("liveSection.backgroundImage")) persistedFields.push("liveSection.backgroundImage")
        if (!persistedNodes.includes("live-section-bg-image")) persistedNodes.push("live-section-bg-image")
      }
    }
    const hasLiveLayout = mergedLiveElementStyles !== null && Object.keys(mergedLiveElementStyles).length > 0
    if (hasLiveLayout) liveSectionPatch.elementStyles = mergedLiveElementStyles

    let liveSectionDocumentId: string | null = null
    if (Object.keys(liveSectionPatch).length > 0) {
      const liveSetPayload: Record<string, unknown> & { _id?: string; _type?: string } = {
        updatedAt: new Date().toISOString(),
        ...liveSectionPatch,
      }
      if (existingLiveSection?._id) {
        const livePatchResponse = await writeClient
          .patch(toPublishedDocumentId(existingLiveSection._id))
          .set(liveSetPayload)
          .commit()
        liveSectionDocumentId = livePatchResponse._id
      } else {
        const liveCreatePayload: Record<string, unknown> & { _id: string; _type: string } = {
          ...liveSetPayload,
          _id: LIVE_SECTION_DOCUMENT_ID,
          _type: SANITY_DOC_LIVE_SECTION,
        }
        const liveCreateResponse = await writeClient.createOrReplace(liveCreatePayload)
        liveSectionDocumentId = liveCreateResponse._id
      }
      steps.push({
        step: "saving",
        ok: true,
        message: `Live section saved: ${liveSectionDocumentId}`,
      })
      if (hasLiveLayout) {
        if (!persistedFields.includes("liveSection.elementStyles")) persistedFields.push("liveSection.elementStyles")
        for (const nodeId of Object.keys(mergedLiveElementStyles || {})) {
          if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
        }
      }
    }

    const liveConcertPatches = collectLiveConcertPatches(payload.nodes)
    const liveConcertDocumentIds: string[] = []
    for (const [editorId, concertPatch] of liveConcertPatches.entries()) {
      const concertDocumentId = `concert-${editorId}`
      const concertPayload = {
        _id: concertDocumentId,
        _type: SANITY_DOC_CONCERT,
        ...concertPatch,
      }
      const concertResponse = await writeClient.createOrReplace(concertPayload)
      liveConcertDocumentIds.push(concertResponse._id)
      if (!persistedFields.includes("concert.fields")) persistedFields.push("concert.fields")
      for (const node of payload.nodes) {
        const parsed = parseLiveConcertNodeId(node.id)
        if (parsed?.editorId === editorId && node.explicitContent && !persistedNodes.includes(node.id)) {
          persistedNodes.push(node.id)
        }
      }
    }
    if (liveConcertDocumentIds.length > 0) {
      steps.push({
        step: "saving",
        ok: true,
        message: `Live concert fields saved: ${liveConcertDocumentIds.length} document(s).`,
      })
    }

    // ========== Band Members Materialization ==========
    let bandMembersElementStyles: Record<string, Record<string, unknown>> = {}
    let hasBandMembersChanges = false

    for (const node of payload.nodes) {
      if (!isBandMembersNodeId(node.id)) continue
      const hasScale = node.explicitStyle && typeof node.style?.scale === "number"
      if (!node.explicitPosition && !node.explicitSize && !node.explicitStyle && !hasScale) continue
      const style: Record<string, unknown> = {}
      mergeStableElementStyleFromNode(style, node)
      if (Object.keys(style).length === 0) continue
      bandMembersElementStyles[node.id] = style
      hasBandMembersChanges = true
    }

    let bandMembersDocumentId: string | null = null
    const bandMembersContentPatches = new Map<number, Record<string, unknown>>()
    for (const node of payload.nodes) {
      if (!node.explicitContent) continue
      const parsed = parseBandMemberNodeId(node.id)
      if (!parsed?.field) continue
      const patch = bandMembersContentPatches.get(parsed.index) || {}
      if (parsed.field === "name") {
        const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
        if (text) patch.fullName = text
      } else if (parsed.field === "role") {
        const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
        if (text) patch.role = text
      } else if (parsed.field === "image") {
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        const { imageField, skippedReason } = resolveSanityImagePatch(node.id, src, projectId, dataset)
        if (skippedReason) {
          skippedNodes.push(skippedReason)
        } else if (imageField) {
          patch.portraitImage = imageField
        }
      } else if (parsed.field === "number") {
        skippedNodes.push(`${node.id}:number-is-derived-from-member-order`)
      }
      if (Object.keys(patch).length > 0) bandMembersContentPatches.set(parsed.index, patch)
    }

    const bandBackgroundNode = payload.nodes.find((node) => node.id === "band-members-bg")
    const bandSettingsPatch: Record<string, unknown> = {}
    if (bandBackgroundNode?.explicitContent) {
      const src = typeof bandBackgroundNode.content?.src === "string" ? bandBackgroundNode.content.src.trim() : ""
      const { imageField, skippedReason } = resolveSanityImagePatch("band-members-bg", src, projectId, dataset)
      if (skippedReason) {
        skippedNodes.push(skippedReason)
      } else if (imageField) {
        bandSettingsPatch.backgroundImage = imageField
        if (!persistedFields.includes("bandMembersSettings.backgroundImage")) {
          persistedFields.push("bandMembersSettings.backgroundImage")
        }
        if (!persistedNodes.includes("band-members-bg")) persistedNodes.push("band-members-bg")
        hasBandMembersChanges = true
      }
    }

    if (hasBandMembersChanges) {
      const existingBandSettings = await writeClient.fetch<{
        _id: string
        elementStyles?: unknown
      } | null>(
        `*[_type == $bandType][0]{ _id, elementStyles }`,
        { bandType: SANITY_DOC_BAND_MEMBERS }
      )

      const priorStyles = normalizeStoredElementStyles(existingBandSettings?.elementStyles)
      const mergedBandStyles: Record<string, Record<string, unknown>> = { ...priorStyles }
      for (const [nodeId, styles] of Object.entries(bandMembersElementStyles)) {
        mergedBandStyles[nodeId] = { ...(mergedBandStyles[nodeId] || {}), ...styles }
      }

      if (existingBandSettings?._id) {
        const bandPatch = { ...bandSettingsPatch, elementStyles: mergedBandStyles, updatedAt: new Date().toISOString() }
        await writeClient.patch(toPublishedDocumentId(existingBandSettings._id)).set(bandPatch).commit()

        bandMembersDocumentId = existingBandSettings._id
        log("band-members patch committed", { docId: bandMembersDocumentId })
        steps.push({
          step: "saving",
          ok: true,
          message: `Band Members settings layout updated: ${bandMembersDocumentId}`,
        })
      } else {
        const bandCreatePayload: Record<string, unknown> & { _id: string; _type: string } = {
          _id: BAND_MEMBERS_DOCUMENT_ID,
          _type: SANITY_DOC_BAND_MEMBERS,
          ...bandSettingsPatch,
          elementStyles: mergedBandStyles,
          updatedAt: new Date().toISOString(),
        }
        const bandResponse = await writeClient.createOrReplace(bandCreatePayload)
        bandMembersDocumentId = bandResponse._id
        log("band-members settings created", { docId: bandMembersDocumentId })
        steps.push({
          step: "saving",
          ok: true,
          message: `Band Members settings document created: ${bandMembersDocumentId}`,
        })
      }

      if (!persistedFields.includes("bandMembersSettings.elementStyles")) {
        persistedFields.push("bandMembersSettings.elementStyles")
      }
      for (const nodeId of Object.keys(bandMembersElementStyles)) {
        if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
      }
    }

    if (bandMembersContentPatches.size > 0) {
      const existingBandMembers = await writeClient.fetch<Array<{
        _id: string
        order?: number
        fullName?: string
        role?: string
        portraitImage?: { asset?: { _ref?: string; _id?: string } }
      }>>(
        `*[_type == "bandMember"] | order(order asc){ _id, order, fullName, role, portraitImage{asset->{_id}} }`
      )

      for (const [index, patch] of bandMembersContentPatches.entries()) {
        const target = existingBandMembers[index]
        if (!target?._id) {
          skippedNodes.push(`member-item-${index}:missing-band-member-doc`)
          continue
        }
        const patchWithTimestamp = { ...patch, updatedAt: new Date().toISOString() }
        await writeClient.patch(toPublishedDocumentId(target._id)).set(patchWithTimestamp).commit()
        if (!persistedFields.includes("bandMember.fields")) persistedFields.push("bandMember.fields")
        for (const field of Object.keys(patch)) {
          const nodeId = field === "fullName"
            ? `member-item-${index}-name`
            : field === "role"
              ? `member-item-${index}-role`
              : field === "portraitImage"
                ? `member-item-${index}-image`
                : `member-item-${index}`
          if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
        }
      }

      steps.push({
        step: "saving",
        ok: true,
        message: `Band Members fields saved: ${bandMembersContentPatches.size} member patch(es).`,
      })
    }

    // ========== Contact Materialization ==========
    const contactPatch: Record<string, unknown> = buildContactContentPatch(payload.nodes, existingContact || {})
    const contactElementStyles: Record<string, Record<string, unknown>> = {}

    for (const node of payload.nodes) {
      if (!CONTACT_NODE_IDS.has(node.id)) continue
      const hasScale = node.explicitStyle && typeof node.style?.scale === "number"
      if (!node.explicitPosition && !node.explicitSize && !node.explicitStyle && !hasScale) continue
      const style: Record<string, unknown> = {}
      mergeStableElementStyleFromNode(style, node)
      if (Object.keys(style).length === 0) continue
      contactElementStyles[node.id] = style
    }

    const contactBgNode = payload.nodes.find((node) => node.id === "contact-bg-image")
    if (contactBgNode?.explicitContent) {
      const src = typeof contactBgNode.content?.src === "string" ? contactBgNode.content.src.trim() : ""
      const { imageField, skippedReason } = resolveSanityImagePatch("contact-bg-image", src, projectId, dataset)
      if (skippedReason) {
        skippedNodes.push(skippedReason)
      } else if (imageField) {
        contactPatch.backgroundImage = imageField
        if (!persistedFields.includes("contactSection.backgroundImage")) persistedFields.push("contactSection.backgroundImage")
        if (!persistedNodes.includes("contact-bg-image")) persistedNodes.push("contact-bg-image")
      }
    }

    if (Object.keys(contactElementStyles).length > 0) {
      const priorContactStyles = normalizeStoredElementStyles(existingContact?.elementStyles)
      const mergedContactStyles: Record<string, Record<string, unknown>> = { ...priorContactStyles }
      for (const [nodeId, styles] of Object.entries(contactElementStyles)) {
        mergedContactStyles[nodeId] = { ...(mergedContactStyles[nodeId] || {}), ...styles }
      }
      contactPatch.elementStyles = mergedContactStyles
      if (!persistedFields.includes("contactSection.elementStyles")) persistedFields.push("contactSection.elementStyles")
      for (const nodeId of Object.keys(contactElementStyles)) {
        if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
      }
    }

    let contactDocumentId: string | null = null
    if (Object.keys(contactPatch).length > 0) {
      const patchWithTimestamp = { ...contactPatch, updatedAt: new Date().toISOString() }
      if (existingContact?._id) {
        const contactResponse = await writeClient.patch(toPublishedDocumentId(existingContact._id)).set(patchWithTimestamp).commit()
        contactDocumentId = contactResponse._id
      } else {
        const contactPayload: Record<string, unknown> & { _id: string; _type: string } = {
          _id: CONTACT_DOCUMENT_ID,
          _type: SANITY_DOC_CONTACT,
          ...patchWithTimestamp,
        }
        const contactResponse = await writeClient.createOrReplace(contactPayload)
        contactDocumentId = contactResponse._id
      }

      for (const node of payload.nodes) {
        if (CONTACT_NODE_IDS.has(node.id) && (node.explicitContent || node.explicitStyle || node.explicitPosition || node.explicitSize)) {
          if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
        }
      }
      steps.push({
        step: "saving",
        ok: true,
        message: `Contact section saved: ${contactDocumentId}`,
      })
    }

    // ========== Footer Materialization ==========
    const footerPatch: Record<string, unknown> = buildFooterContentPatch(payload.nodes, existingFooter || {})
    const footerElementStyles: Record<string, Record<string, unknown>> = {}

    for (const node of payload.nodes) {
      if (!FOOTER_NODE_IDS.has(node.id)) continue
      const hasScale = node.explicitStyle && typeof node.style?.scale === "number"
      if (!node.explicitPosition && !node.explicitSize && !node.explicitStyle && !hasScale) continue
      const style: Record<string, unknown> = {}
      mergeStableElementStyleFromNode(style, node)
      if (Object.keys(style).length === 0) continue
      footerElementStyles[node.id] = style
    }

    const footerLogoNode = payload.nodes.find((node) => node.id === "footer-logo")
    if (footerLogoNode?.explicitContent) {
      const src = typeof footerLogoNode.content?.src === "string" ? footerLogoNode.content.src.trim() : ""
      const alt = typeof footerLogoNode.content?.alt === "string" ? footerLogoNode.content.alt.trim() : ""
      const { imageField, skippedReason } = resolveSanityImagePatch("footer-logo", src, projectId, dataset)
      if (skippedReason) {
        skippedNodes.push(skippedReason)
      } else if (imageField) {
        footerPatch.logo = imageField
        if (alt) footerPatch.logoAlt = alt
        if (!persistedFields.includes("footerSection.logo")) persistedFields.push("footerSection.logo")
        if (!persistedNodes.includes("footer-logo")) persistedNodes.push("footer-logo")
      }
    }

    if (Object.keys(footerElementStyles).length > 0) {
      const priorFooterStyles = normalizeStoredElementStyles(existingFooter?.elementStyles)
      const mergedFooterStyles: Record<string, Record<string, unknown>> = { ...priorFooterStyles }
      for (const [nodeId, styles] of Object.entries(footerElementStyles)) {
        mergedFooterStyles[nodeId] = { ...(mergedFooterStyles[nodeId] || {}), ...styles }
      }
      footerPatch.elementStyles = mergedFooterStyles
      if (!persistedFields.includes("footerSection.elementStyles")) persistedFields.push("footerSection.elementStyles")
      for (const nodeId of Object.keys(footerElementStyles)) {
        if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
      }
    }

    let footerDocumentId: string | null = null
    if (Object.keys(footerPatch).length > 0) {
      const patchWithTimestamp = { ...footerPatch, updatedAt: new Date().toISOString() }
      if (existingFooter?._id) {
        const footerResponse = await writeClient.patch(toPublishedDocumentId(existingFooter._id)).set(patchWithTimestamp).commit()
        footerDocumentId = footerResponse._id
      } else {
        const footerPayload: Record<string, unknown> & { _id: string; _type: string } = {
          _id: FOOTER_DOCUMENT_ID,
          _type: SANITY_DOC_FOOTER,
          ...patchWithTimestamp,
        }
        const footerResponse = await writeClient.createOrReplace(footerPayload)
        footerDocumentId = footerResponse._id
      }

      for (const node of payload.nodes) {
        if (FOOTER_NODE_IDS.has(node.id) && (node.explicitContent || node.explicitStyle || node.explicitPosition || node.explicitSize)) {
          if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
        }
      }
      steps.push({
        step: "saving",
        ok: true,
        message: `Footer section saved: ${footerDocumentId}`,
      })
    }

    let homeEditorStateDocumentId: string | null = null
    if (Array.isArray(payload.nodes) && payload.nodes.length > 0) {
      const homeStateDocument = {
        _id: HOME_EDITOR_STATE_DOCUMENT_ID,
        _type: SANITY_DOC_HOME_EDITOR_STATE,
        updatedAt: new Date().toISOString(),
        nodesJson: JSON.stringify(payload.nodes),
      }
      const homeStateResponse = await writeClient.createOrReplace(homeStateDocument)
      homeEditorStateDocumentId = homeStateResponse._id
      steps.push({
        step: "saving",
        ok: true,
        message: `Home editor central state saved: ${HOME_EDITOR_STATE_DOCUMENT_ID} (${payload.nodes.length} nodes).`,
      })
      persistedFields.push("homeEditorState.nodesJson")
      for (const node of payload.nodes) {
        if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
      }
    }

    // Process Hero element style overrides (position, size, typography)
    if (Object.keys(payload.heroElementStyles || {}).length > 0 || Object.keys(elementStylesInPayload).length > 0) {
      const elementStyles = payload.heroElementStyles || {}

      log("element styles received", {
        targetCount: Object.keys(elementStyles).length,
        targets: Object.keys(elementStyles)
      })

      // Legacy node IDs to filter out
      const LEGACY_HERO_NODES = new Set(["hero-title-main", "hero-title-accent"])

      // Merge element styles into patch
      const heroElementStyles: Record<string, unknown> = { ...elementStylesInPayload, ...elementStyles }
      for (const [targetId, styles] of Object.entries(elementStyles)) {
        if (typeof styles === 'object' && styles !== null) {
          // Skip legacy nodes even if they appear in payload
          if (LEGACY_HERO_NODES.has(targetId)) {
            continue
          }
          heroElementStyles[targetId] = styles
          persistedFields.push(`elementStyle:${targetId}`)
          persistedNodes.push(targetId)
        }
      }

      if (Object.keys(heroElementStyles).length > 0) {
        const priorRaw = existingHero?.elementStyles
        let prior =
          priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw)
            ? { ...priorRaw }
            : {}

        // Purge legacy nodes from prior before merging
        for (const legacyNodeId of LEGACY_HERO_NODES) {
          if (legacyNodeId in prior) {
            delete prior[legacyNodeId]
          }
        }

        const merged: Record<string, unknown> = { ...prior }
        for (const [targetId, incoming] of Object.entries(heroElementStyles)) {
          if (typeof incoming === "object" && incoming !== null) {
            const prevTarget =
              merged[targetId] && typeof merged[targetId] === "object"
                ? (merged[targetId] as Record<string, unknown>)
                : {}
            const nextTarget = { ...prevTarget, ...(incoming as Record<string, unknown>) }
            if (HERO_TEXT_NODE_IDS.has(targetId)) {
              delete nextTarget.minHeight
              delete nextTarget.paddingTop
              delete nextTarget.paddingBottom
              if (!isUsableHeroTextElementStyle(nextTarget)) {
                for (const geometryKey of ["x", "y", "width", "height", "scale"]) {
                  delete nextTarget[geometryKey]
                }
              }
            }
            merged[targetId] = nextTarget
          }
        }
        heroPatch.elementStyles = merged

        // Track all hero nodeIds in persistedFields (geometry + styles)
        if (!persistedFields.includes("hero.elementStyles")) {
          persistedFields.push("hero.elementStyles")
        }
        for (const nodeId of Object.keys(merged)) {
          if (!persistedNodes.includes(nodeId)) {
            persistedNodes.push(nodeId)
          }
        }

        // Verify no legacy nodes in final merged
        const finalNodeIds = Object.keys(merged)
        const legacyInMerged = finalNodeIds.filter(id => id.includes("hero-title-main") || id.includes("hero-title-accent"))
        log("element styles patch", {
          styleCount: finalNodeIds.length,
          mergedTargets: finalNodeIds,
          persistedNodeCount: finalNodeIds.length,
          legacyDetected: legacyInMerged.length > 0 ? legacyInMerged : "none"
        })
      }
    }

    if (Object.keys(heroPatch).length > 0) {
      log("patch apply", { fields: Object.keys(heroPatch), willValidate: true })
      
      // Perform patch
      const patchResponse = await writeClient
        .patch(toPublishedDocumentId(existingHero._id))
        .set({ ...heroPatch, updatedAt: new Date().toISOString() })
        .commit()
      log("patch committed", { docId: patchResponse._id, modified: new Date(patchResponse._updatedAt) })
      
      // Fetch published perspective to verify
      const readClient = createClient({
        projectId,
        dataset,
        apiVersion: "2024-01-01",
        useCdn: false,
        token: sanityToken,
        perspective: "published",
      })
      const verifyQuery = `*[_type == $type][0]{ title, titleHighlight, scrollLabel, elementStyles }`
      const verified = await readClient.fetch<{ title?: string; titleHighlight?: string; scrollLabel?: string; elementStyles?: Record<string, unknown> } | null>(
        verifyQuery,
        { type: SANITY_DOC_TYPE }
      )

      log("post-patch verification", {
        title: { sent: heroPatch.title, read: verified?.title, match: verified?.title === heroPatch.title },
        titleHighlight: { sent: heroPatch.titleHighlight, read: verified?.titleHighlight, match: verified?.titleHighlight === heroPatch.titleHighlight },
        elementStyles: {
          sent: Object.keys(heroPatch.elementStyles || {}).length,
          read: Object.keys(verified?.elementStyles || {}).length,
          nodeIds: Object.keys(verified?.elementStyles || {})
        }
      })

      // Validation: check critical fields
      const titleOk = !heroPatch.title || verified?.title === heroPatch.title
      const highlightOk = !heroPatch.titleHighlight || verified?.titleHighlight === heroPatch.titleHighlight

      if (!titleOk || !highlightOk) {
        log("validation failed", { titleOk, highlightOk })
        steps.push({ step: "saving", ok: false, message: `Write verification failed: title=${titleOk}, highlight=${highlightOk}` })
        const errorResponse = {
          status: "failed",
          ok: false,
          step: "saving",
          message: "Deploy failed: data verification failed after write",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: existingHero._id,
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode,
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes,
          skippedNodes,
          failedNodes: [...failedNodes, "write-verification"],
          persistedFields,
          skippedFields,
          diagnostics,
          envDiagnostics,
        }
        log("returning error response", { status: errorResponse.status, ok: errorResponse.ok })
        return NextResponse.json(errorResponse, { status: 500 })
      }
      
      log("validation passed", { fields: Object.keys(heroPatch) })
      steps.push({ step: "saving", ok: true, message: `Hero section patched and verified: ${existingHero._id}` })
    } else {
      log("no patch needed", { reason: "no persistible changes" })
      steps.push({ step: "saving", ok: true, message: "No persistible Hero content changes detected; no patch applied." })
    }

    const publishedDocumentId = existingHero._id
    let localRevalidateOk = false
    if (SHOULD_REVALIDATE_PATH) {
      log("revalidate path", { path: REVALIDATED_PATH })
      revalidatePath(REVALIDATED_PATH)
      steps.push({ step: "revalidating", ok: true, message: "Local Next.js cache revalidated for '/'." })
      localRevalidateOk = true
    } else {
      log("revalidate path skipped", { path: REVALIDATED_PATH })
      steps.push({ step: "revalidating", ok: true, message: "Revalidation skipped in local editor mode." })
    }

    const publicRevalidate = await triggerPublicRevalidate(log)
    if (publicRevalidate.attempted) {
      steps.push({
        step: "revalidating",
        ok: publicRevalidate.ok,
        message: publicRevalidate.message,
      })
    }
    const vercelDeploy = await triggerVercelDeploy(log)
    if (vercelDeploy.attempted) {
      steps.push({
        step: "publishing",
        ok: vercelDeploy.ok,
        message: vercelDeploy.message,
      })
    }

    // Changed-node read-back verification (persisted means verified on read, not just attempted write).
    const [heroReadback, navReadback, introReadback, releaseReadback, liveReadback, concertReadback, bandSettingsReadback, bandMembersReadback, contactReadback, footerReadback, homeStateReadback] = await Promise.all([
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        title?: string
        titleHighlight?: string
        subtitle?: string
        scrollLabel?: string
        backgroundImage?: { asset?: { _ref?: string; _id?: string } }
        logo?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $type][0]{ title, titleHighlight, subtitle, scrollLabel, elementStyles, backgroundImage{asset->{_id}}, logo{asset->{_id}} }`,
        { type: SANITY_DOC_TYPE }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        brandName?: string
        links?: Array<{ label?: string; href?: string }>
        ctaLabel?: string
        ctaHref?: string
        brandLogo?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $type][0]{ elementStyles, brandName, links[]{label, href}, ctaLabel, ctaHref, brandLogo{asset->{_id}} }`,
        { type: SANITY_DOC_NAV }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        bannerText?: string
        gifUrl?: string
        bookLabel?: string
        bookHref?: string
        pressLabel?: string
        pressHref?: string
      } | null>(
        `*[_type == $type][0]{ elementStyles, bannerText, gifUrl, bookLabel, bookHref, pressLabel, pressHref }`,
        { type: SANITY_DOC_INTRO }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        title?: string
        subtitle?: string
        youtubeId?: string
        ctaButtons?: Array<{ label?: string; href?: string }>
      } | null>(
        `*[_type == $type][0]{ elementStyles, title, subtitle, youtubeId, ctaButtons[]{ label, href } }`,
        { type: SANITY_DOC_LATEST_RELEASE }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        backgroundImage?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $type][0]{ elementStyles, backgroundImage{asset->{_id}} }`,
        { type: SANITY_DOC_LIVE_SECTION }
      ),
      writeClient.fetch<Array<{
        editorId?: number
        venue?: string
        city?: string
        country?: string
        date?: string
        time?: string
        status?: string
        genre?: string
        capacity?: string
        price?: number
        ticketUrl?: string
      }>>(
        `*[_type == $type]{ editorId, venue, city, country, date, time, status, genre, capacity, price, ticketUrl }`,
        { type: SANITY_DOC_CONCERT }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        backgroundImage?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $type][0]{ elementStyles, backgroundImage{asset->{_id}} }`,
        { type: SANITY_DOC_BAND_MEMBERS }
      ),
      writeClient.fetch<Array<{
        fullName?: string
        role?: string
        portraitImage?: { asset?: { _ref?: string; _id?: string } }
      }>>(
        `*[_type == "bandMember"] | order(order asc){ fullName, role, portraitImage{asset->{_id}} }`
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        eyebrow?: string
        title?: string
        description?: string
        middleText?: string
        contactMethods?: Array<{ title?: string; description?: string; href?: string; label?: string; contactName?: string }>
        backgroundImage?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $type][0]{ elementStyles, eyebrow, title, description, middleText, contactMethods[]{ title, description, href, label, contactName }, backgroundImage{asset->{_id}} }`,
        { type: SANITY_DOC_CONTACT }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        logo?: { asset?: { _ref?: string; _id?: string } }
        logoAlt?: string
        description?: string
        ctaLabel?: string
        ctaHref?: string
        copyright?: string
        socialLinks?: Array<{ id?: string; name?: string; href?: string }>
      } | null>(
        `*[_type == $type][0]{ elementStyles, logo{asset->{_id}}, logoAlt, description, ctaLabel, ctaHref, copyright, socialLinks[]{ id, name, href } }`,
        { type: SANITY_DOC_FOOTER }
      ),
      writeClient.fetch<{ nodesJson?: string } | null>(
        `*[_type == $homeType && _id == $homeId][0]{ nodesJson }`,
        { homeType: SANITY_DOC_HOME_EDITOR_STATE, homeId: HOME_EDITOR_STATE_DOCUMENT_ID }
      ),
    ])

    const changedNodesPersisted: string[] = []
    const changedNodesSkipped: string[] = []
    const changedNodesFailed: string[] = []
    const verificationByNodeId: Record<string, NodeVerificationResult> = {}

    for (const nodeId of changedNodeIds) {
      const node = payloadNodeById.get(nodeId)
      if (!node) {
        const mismatchReason = "missing-payload-node"
        changedNodesFailed.push(nodeId)
        if (!failedNodes.includes(`${nodeId}:${mismatchReason}`)) failedNodes.push(`${nodeId}:${mismatchReason}`)
        verificationByNodeId[nodeId] = {
          storageTarget: "unknown",
          expected: {},
          readBack: null,
          matched: false,
          mismatchReason,
        }
        continue
      }

      const failedMarker = getNodeFailureMarker(nodeId, failedNodes)
      if (failedMarker) {
        changedNodesFailed.push(nodeId)
        verificationByNodeId[nodeId] = {
          storageTarget: "unknown",
          expected: {},
          readBack: null,
          matched: false,
          mismatchReason: failedMarker,
        }
        continue
      }

      const skippedMarker = getNodeFailureMarker(nodeId, skippedNodes)
      if (skippedMarker) {
        changedNodesSkipped.push(nodeId)
        verificationByNodeId[nodeId] = {
          storageTarget: "unknown",
          expected: {},
          readBack: null,
          matched: false,
          mismatchReason: skippedMarker,
        }
        continue
      }

      const expected: Record<string, unknown> = {}
      const readBack: Record<string, unknown> = {}
      let storageTarget = "unknown"

      const writeStyleKeys = new Set<string>()
      if (node.explicitStyle) {
        for (const [key, value] of Object.entries(node.style || {})) {
          if (value !== undefined && value !== null) writeStyleKeys.add(key)
        }
      }
      const writeContentKeys = new Set<string>()
      if (node.explicitContent) {
        for (const [key, value] of Object.entries(node.content || {})) {
          if (value !== undefined && value !== null) writeContentKeys.add(key)
        }
      }

      const isHeroLayoutId =
        nodeId === "hero-section" ||
        nodeId === "hero-bg-image" ||
        nodeId === "hero-title" ||
        nodeId === "hero-subtitle" ||
        nodeId === "hero-logo" ||
        nodeId === "hero-scroll-indicator" ||
        nodeId === "hero-scroll-label" ||
        nodeId === "hero-buttons"
      const isNavLayoutIdChanged = isNavLayoutId(nodeId)
      const isIntroLayoutIdChanged = INTRO_LAYOUT_IDS.has(nodeId)
      const isReleaseLayoutIdChanged = RELEASE_NODE_IDS.has(nodeId)
      const isLiveLayoutIdChanged = isLiveNodeId(nodeId)
      const isBandMembersLayoutIdChanged = isBandMembersNodeId(nodeId)
      const isContactNodeIdChanged = CONTACT_NODE_IDS.has(nodeId)
      const isFooterNodeIdChanged = FOOTER_NODE_IDS.has(nodeId)
      const shouldVerifyHomeState = shouldVerifyInHomeEditorState(node)

      const expectedScale =
        !HERO_TEXT_NODE_IDS.has(nodeId) && node.explicitStyle && typeof node.style.scale === "number"
          ? Math.round(node.style.scale * 1000) / 1000
          : undefined
      const addHeroLayoutReadback = () => {
        const heroStyle = heroReadback?.elementStyles?.[nodeId] || {}
        const isHeroTextNode = HERO_TEXT_NODE_IDS.has(nodeId)
        const hasUsableHeroTextGeometry = isHeroTextNode && isUsableHeroTextGeometryInput(node)
        if ((!isHeroTextNode || hasUsableHeroTextGeometry) && node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          const readX = (heroStyle as Record<string, unknown>).x
          const readY = (heroStyle as Record<string, unknown>).y
          readBack.x = typeof readX === "number" ? roundLayoutPx(readX) : readX
          readBack.y = typeof readY === "number" ? roundLayoutPx(readY) : readY
        }
        if ((!isHeroTextNode || hasUsableHeroTextGeometry) && node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          const readWidth = (heroStyle as Record<string, unknown>).width
          const readHeight = (heroStyle as Record<string, unknown>).height
          readBack.width = typeof readWidth === "number" ? roundLayoutPx(readWidth) : readWidth
          readBack.height = typeof readHeight === "number" ? roundLayoutPx(readHeight) : readHeight
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (heroStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          const st = node.style as Record<string, unknown>
          if (HERO_TEXT_NODE_IDS.has(nodeId)) {
            if (writeStyleKeys.has("color")) {
              expected.color = st.color
              readBack.color = (heroStyle as Record<string, unknown>).color
            }
            if (writeStyleKeys.has("fontSize")) {
              expected.fontSize = parsePxNumber(st.fontSize as string | undefined)
              readBack.fontSize = (heroStyle as Record<string, unknown>).fontSize
            }
            if (writeStyleKeys.has("fontWeight")) {
              const fw = st.fontWeight
              const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
              expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
              readBack.fontWeight = (heroStyle as Record<string, unknown>).fontWeight
            }
            if (writeStyleKeys.has("opacity")) {
              expected.opacity = normalizeComparableValue(st.opacity)
              readBack.opacity = normalizeComparableValue((heroStyle as Record<string, unknown>).opacity)
            }
            if (writeStyleKeys.has("fontStyle")) {
              expected.italic = st.fontStyle === "italic"
              readBack.italic = (heroStyle as Record<string, unknown>).italic
            }
            if (writeStyleKeys.has("textDecoration")) {
              expected.underline = st.textDecoration === "underline"
              readBack.underline = (heroStyle as Record<string, unknown>).underline
            }
            if (writeStyleKeys.has("textShadowEnabled")) {
              expected.textShadowEnabled = st.textShadowEnabled
              readBack.textShadowEnabled = (heroStyle as Record<string, unknown>).textShadowEnabled
            }
            if (writeStyleKeys.has("gradientEnabled")) {
              expected.gradientEnabled = st.gradientEnabled
              readBack.gradientEnabled = (heroStyle as Record<string, unknown>).gradientEnabled
            }
            if (writeStyleKeys.has("gradientStart")) {
              expected.gradientStart = st.gradientStart
              readBack.gradientStart = (heroStyle as Record<string, unknown>).gradientStart
            }
            if (writeStyleKeys.has("gradientEnd")) {
              expected.gradientEnd = st.gradientEnd
              readBack.gradientEnd = (heroStyle as Record<string, unknown>).gradientEnd
            }
          }
          if (HERO_IMAGE_NODE_IDS.has(nodeId)) {
            for (const key of ["opacity", "contrast", "saturation", "brightness", "negative"]) {
              if (writeStyleKeys.has(key)) {
                expected[key] = normalizeHeroEffectComparableValue(st[key])
                readBack[key] = normalizeHeroEffectComparableValue((heroStyle as Record<string, unknown>)[key])
              }
            }
          }
        }
      }
      const addReleaseLayoutReadback = () => {
        const releaseStyle = releaseReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (releaseStyle as Record<string, unknown>).x
          readBack.y = (releaseStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (releaseStyle as Record<string, unknown>).width
          readBack.height = (releaseStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (releaseStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          if (writeStyleKeys.has("color")) {
            expected.color = node.style.color
            readBack.color = (releaseStyle as Record<string, unknown>).color
          }
          if (writeStyleKeys.has("fontSize")) {
            expected.fontSize = parsePxNumber(node.style.fontSize)
            readBack.fontSize = (releaseStyle as Record<string, unknown>).fontSize
          }
          if (writeStyleKeys.has("fontWeight")) {
            const fw = node.style.fontWeight
            const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
            expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
            readBack.fontWeight = (releaseStyle as Record<string, unknown>).fontWeight
          }
        }
      }
      const addLiveLayoutReadback = () => {
        const liveStyle = liveReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (liveStyle as Record<string, unknown>).x
          readBack.y = (liveStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (liveStyle as Record<string, unknown>).width
          readBack.height = (liveStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (liveStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          if (writeStyleKeys.has("color")) {
            expected.color = node.style.color
            readBack.color = (liveStyle as Record<string, unknown>).color
          }
          if (writeStyleKeys.has("fontSize")) {
            expected.fontSize = parsePxNumber(node.style.fontSize)
            readBack.fontSize = (liveStyle as Record<string, unknown>).fontSize
          }
          if (writeStyleKeys.has("fontWeight")) {
            const fw = node.style.fontWeight
            const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
            expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
            readBack.fontWeight = (liveStyle as Record<string, unknown>).fontWeight
          }
        }
      }
      const addBandMembersLayoutReadback = () => {
        const bandStyle = bandSettingsReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (bandStyle as Record<string, unknown>).x
          readBack.y = (bandStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (bandStyle as Record<string, unknown>).width
          readBack.height = (bandStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (bandStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          if (writeStyleKeys.has("color")) {
            expected.color = node.style.color
            readBack.color = (bandStyle as Record<string, unknown>).color
          }
          if (writeStyleKeys.has("fontSize")) {
            expected.fontSize = parsePxNumber(node.style.fontSize)
            readBack.fontSize = (bandStyle as Record<string, unknown>).fontSize
          }
          if (writeStyleKeys.has("fontWeight")) {
            const fw = node.style.fontWeight
            const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
            expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
            readBack.fontWeight = (bandStyle as Record<string, unknown>).fontWeight
          }
          for (const key of ["opacity", "contrast", "saturation", "brightness", "negative"]) {
            if (writeStyleKeys.has(key)) {
              expected[key] = normalizeComparableValue(node.style[key as keyof DeployNodePayload["style"]])
              readBack[key] = normalizeComparableValue((bandStyle as Record<string, unknown>)[key])
            }
          }
        }
      }
      const addContactLayoutReadback = () => {
        const contactStyle = contactReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (contactStyle as Record<string, unknown>).x
          readBack.y = (contactStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (contactStyle as Record<string, unknown>).width
          readBack.height = (contactStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (contactStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          if (writeStyleKeys.has("color")) {
            expected.color = node.style.color
            readBack.color = (contactStyle as Record<string, unknown>).color
          }
          if (writeStyleKeys.has("fontSize")) {
            expected.fontSize = parsePxNumber(node.style.fontSize)
            readBack.fontSize = (contactStyle as Record<string, unknown>).fontSize
          }
          if (writeStyleKeys.has("fontWeight")) {
            const fw = node.style.fontWeight
            const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
            expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
            readBack.fontWeight = (contactStyle as Record<string, unknown>).fontWeight
          }
          for (const key of ["opacity", "contrast", "saturation", "brightness", "negative"]) {
            if (writeStyleKeys.has(key)) {
              expected[key] = normalizeComparableValue(node.style[key as keyof DeployNodePayload["style"]])
              readBack[key] = normalizeComparableValue((contactStyle as Record<string, unknown>)[key])
            }
          }
        }
      }
      const addFooterLayoutReadback = () => {
        const footerStyle = footerReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (footerStyle as Record<string, unknown>).x
          readBack.y = (footerStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (footerStyle as Record<string, unknown>).width
          readBack.height = (footerStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (footerStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          if (writeStyleKeys.has("color")) {
            expected.color = node.style.color
            readBack.color = (footerStyle as Record<string, unknown>).color
          }
          if (writeStyleKeys.has("fontSize")) {
            expected.fontSize = parsePxNumber(node.style.fontSize)
            readBack.fontSize = (footerStyle as Record<string, unknown>).fontSize
          }
          if (writeStyleKeys.has("fontWeight")) {
            const fw = node.style.fontWeight
            const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
            expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
            readBack.fontWeight = (footerStyle as Record<string, unknown>).fontWeight
          }
          for (const key of ["opacity", "contrast", "saturation", "brightness", "negative"]) {
            if (writeStyleKeys.has(key)) {
              expected[key] = normalizeComparableValue(node.style[key as keyof DeployNodePayload["style"]])
              readBack[key] = normalizeComparableValue((footerStyle as Record<string, unknown>)[key])
            }
          }
        }
      }

      if (nodeId === "hero-title" && node.explicitContent && node.type === "text") {
        storageTarget = "heroSection.fields"
        const titleText = typeof node.content?.text === "string" ? node.content.text.trim() : ""
        if (titleText) expected.title = titleText
        // When hero-title is single text node, titleHighlight should be cleared
        expected.titleHighlight = ""
        readBack.title = heroReadback?.title
        readBack.titleHighlight = heroReadback?.titleHighlight
        addHeroLayoutReadback()
      } else if (nodeId === "hero-subtitle" && node.explicitContent) {
        storageTarget = "heroSection.fields"
        const expectedText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        expected.subtitle = expectedText
        readBack.subtitle = heroReadback?.subtitle
        addHeroLayoutReadback()
      } else if ((nodeId === "hero-scroll-label" || nodeId === "hero-scroll-indicator") && node.explicitContent) {
        storageTarget = "heroSection.fields"
        const expectedText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        expected.scrollLabel = expectedText
        readBack.scrollLabel = heroReadback?.scrollLabel
        addHeroLayoutReadback()
      } else if (nodeId === "hero-bg-image" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "heroSection.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.backgroundImageRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.backgroundImageRef = heroReadback?.backgroundImage?.asset?._ref ?? heroReadback?.backgroundImage?.asset?._id
        addHeroLayoutReadback()
      } else if (nodeId === "hero-logo" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "heroSection.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.logoRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.logoRef = heroReadback?.logo?.asset?._ref ?? heroReadback?.logo?.asset?._id
        addHeroLayoutReadback()
      } else if (isHeroLayoutId && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "heroSection.elementStyles"
        addHeroLayoutReadback()
      } else if (isNavLayoutIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "navigation.elementStyles"
        const navStyle = navReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          const readX = (navStyle as Record<string, unknown>).x
          const readY = (navStyle as Record<string, unknown>).y
          readBack.x = typeof readX === "number" ? roundLayoutPx(readX) : readX
          readBack.y = typeof readY === "number" ? roundLayoutPx(readY) : readY
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          const readWidth = (navStyle as Record<string, unknown>).width
          const readHeight = (navStyle as Record<string, unknown>).height
          readBack.width = typeof readWidth === "number" ? roundLayoutPx(readWidth) : readWidth
          readBack.height = typeof readHeight === "number" ? roundLayoutPx(readHeight) : readHeight
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (navStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          const st = node.style as Record<string, unknown>
          if (NAVBAR_TEXT_NODE_IDS.has(nodeId) || isNavbarButtonPatternNodeId(nodeId)) {
            if (writeStyleKeys.has("textShadowEnabled")) {
              expected.textShadowEnabled = st.textShadowEnabled
              readBack.textShadowEnabled = (navStyle as Record<string, unknown>).textShadowEnabled
            }
            if (writeStyleKeys.has("gradientEnabled")) {
              expected.gradientEnabled = st.gradientEnabled
              readBack.gradientEnabled = (navStyle as Record<string, unknown>).gradientEnabled
            }
            if (writeStyleKeys.has("gradientStart")) {
              expected.gradientStart = st.gradientStart
              readBack.gradientStart = (navStyle as Record<string, unknown>).gradientStart
            }
            if (writeStyleKeys.has("gradientEnd")) {
              expected.gradientEnd = st.gradientEnd
              readBack.gradientEnd = (navStyle as Record<string, unknown>).gradientEnd
            }
          }
          if (isNavbarBoxPatternNodeId(nodeId)) {
            if (typeof st.backgroundColor === "string") {
              expected.backgroundColor = st.backgroundColor
              readBack.backgroundColor = (navStyle as Record<string, unknown>).backgroundColor
            }
          }
        }
      } else if (nodeId === "nav-brand-name" && node.explicitContent) {
        storageTarget = "navigation.fields"
        expected.brandName = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.brandName = navReadback?.brandName
      } else if (/^nav-(?:mobile-)?link-\d+$/.test(nodeId) && node.explicitContent) {
        storageTarget = "navigation.fields"
        const match = /^nav-(?:mobile-)?link-(\d+)$/.exec(nodeId)
        const linkIndex = match ? Number(match[1]) : -1
        const navLink = linkIndex >= 0 ? navReadback?.links?.[linkIndex] : undefined
        if (writeContentKeys.has("text")) {
          expected[`links[${linkIndex}].label`] = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack[`links[${linkIndex}].label`] = navLink?.label
        }
        if (writeContentKeys.has("href")) {
          expected[`links[${linkIndex}].href`] = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack[`links[${linkIndex}].href`] = navLink?.href
        }
      } else if ((nodeId === "nav-book-button" || nodeId === "nav-mobile-book-button") && node.explicitContent) {
        storageTarget = "navigation.fields"
        if (writeContentKeys.has("text")) {
          expected.ctaLabel = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.ctaLabel = navReadback?.ctaLabel
        }
        if (writeContentKeys.has("href")) {
          expected.ctaHref = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack.ctaHref = navReadback?.ctaHref
        }
      } else if (nodeId === "nav-logo" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "navigation.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.brandLogoRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.brandLogoRef = navReadback?.brandLogo?.asset?._ref ?? navReadback?.brandLogo?.asset?._id
      } else if (isIntroLayoutIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "introBanner.elementStyles"
        const introStyle = introReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (introStyle as Record<string, unknown>).x
          readBack.y = (introStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (introStyle as Record<string, unknown>).width
          readBack.height = (introStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (introStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          if (writeStyleKeys.has("color")) {
            expected.color = node.style.color
            readBack.color = (introStyle as Record<string, unknown>).color
          }
          if (writeStyleKeys.has("fontSize")) {
            expected.fontSize = parsePxNumber(node.style.fontSize)
            readBack.fontSize = (introStyle as Record<string, unknown>).fontSize
          }
          if (writeStyleKeys.has("fontWeight")) {
            const fw = node.style.fontWeight
            const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
            expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
            readBack.fontWeight = (introStyle as Record<string, unknown>).fontWeight
          }
        }
      } else if (nodeId === "intro-banner-text" && node.explicitContent) {
        storageTarget = "introBanner.fields"
        expected.bannerText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.bannerText = introReadback?.bannerText
      } else if (nodeId === "intro-banner-gif" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "introBanner.fields"
        const gifSrc = typeof node.content.src === "string" ? node.content.src.trim() : ""
        // Only expect persistence if source is valid (not blob/data URL)
        if (gifSrc && isImageSrcPersistable(gifSrc)) {
          expected.gifUrl = gifSrc
        }
        readBack.gifUrl = introReadback?.gifUrl
      } else if (nodeId === "intro-book-button" && node.explicitContent) {
        storageTarget = "introBanner.fields"
        if (writeContentKeys.has("text")) {
          expected.bookLabel = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.bookLabel = introReadback?.bookLabel
        }
        if (writeContentKeys.has("href")) {
          expected.bookHref = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack.bookHref = introReadback?.bookHref
        }
      } else if (nodeId === "intro-press-button" && node.explicitContent) {
        storageTarget = "introBanner.fields"
        if (writeContentKeys.has("text")) {
          expected.pressLabel = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.pressLabel = introReadback?.pressLabel
        }
        if (writeContentKeys.has("href")) {
          expected.pressHref = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack.pressHref = introReadback?.pressHref
        }
      } else if (nodeId === "latest-release-title" && node.explicitContent) {
        storageTarget = "latestRelease.fields"
        expected.title = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.title = releaseReadback?.title
        addReleaseLayoutReadback()
      } else if (nodeId === "latest-release-subtitle" && node.explicitContent) {
        storageTarget = "latestRelease.fields"
        expected.subtitle = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.subtitle = releaseReadback?.subtitle
        addReleaseLayoutReadback()
      } else if (nodeId === "latest-release-bg" && node.explicitContent) {
        storageTarget = "latestRelease.fields"
        const source =
          typeof node.content.videoUrl === "string" && node.content.videoUrl.trim()
            ? node.content.videoUrl
            : typeof node.content.src === "string"
              ? node.content.src
              : ""
        expected.youtubeId = parseYouTubeId(source)
        readBack.youtubeId = releaseReadback?.youtubeId
        addReleaseLayoutReadback()
      } else if ((nodeId === "latest-release-watch-button" || nodeId === "latest-release-shows-button") && node.explicitContent) {
        storageTarget = "latestRelease.fields"
        const buttonIndex = nodeId === "latest-release-watch-button" ? 0 : 1
        const button = releaseReadback?.ctaButtons?.[buttonIndex]
        if (writeContentKeys.has("text")) {
          expected[`ctaButtons[${buttonIndex}].label`] = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack[`ctaButtons[${buttonIndex}].label`] = button?.label
        }
        if (writeContentKeys.has("href")) {
          expected[`ctaButtons[${buttonIndex}].href`] = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack[`ctaButtons[${buttonIndex}].href`] = button?.href
        }
        addReleaseLayoutReadback()
      } else if (isReleaseLayoutIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "latestRelease.elementStyles"
        addReleaseLayoutReadback()
      } else if (nodeId === "live-section-bg-image" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "liveSection.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.backgroundImageRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.backgroundImageRef = liveReadback?.backgroundImage?.asset?._ref ?? liveReadback?.backgroundImage?.asset?._id
        addLiveLayoutReadback()
      } else if (parseLiveConcertNodeId(nodeId) && node.explicitContent) {
        storageTarget = "concert.fields"
        const parsed = parseLiveConcertNodeId(nodeId)
        const concert = concertReadback.find((item) => item.editorId === parsed?.editorId)
        const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
        if (parsed?.field === "price") {
          expected.price = normalizeConcertPriceForSanity(text)
          readBack.price = concert?.price
        } else if (parsed?.field === "locationUrl") {
          expected.ticketUrl = typeof node.content.href === "string" ? node.content.href.trim() : text
          readBack.ticketUrl = concert?.ticketUrl
        } else if (parsed?.field) {
          expected[parsed.field] = text
          readBack[parsed.field] = concert?.[parsed.field as keyof typeof concert]
        }
        addLiveLayoutReadback()
      } else if (isLiveLayoutIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "liveSection.elementStyles"
        addLiveLayoutReadback()
      } else if (nodeId === "band-members-bg" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "bandMembersSettings.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.backgroundImageRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.backgroundImageRef = bandSettingsReadback?.backgroundImage?.asset?._ref ?? bandSettingsReadback?.backgroundImage?.asset?._id
        addBandMembersLayoutReadback()
      } else if (parseBandMemberNodeId(nodeId)?.field && node.explicitContent) {
        storageTarget = "bandMember.fields"
        const parsed = parseBandMemberNodeId(nodeId)
        const member = typeof parsed?.index === "number" ? bandMembersReadback[parsed.index] : undefined
        if (parsed?.field === "name") {
          expected.fullName = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.fullName = member?.fullName
        } else if (parsed?.field === "role") {
          expected.role = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.role = member?.role
        } else if (parsed?.field === "image") {
          const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
          expected.portraitImageRef = parseSanityImageRefFromUrl(src, projectId, dataset)
          readBack.portraitImageRef = member?.portraitImage?.asset?._ref ?? member?.portraitImage?.asset?._id
        }
        addBandMembersLayoutReadback()
      } else if (isBandMembersLayoutIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "bandMembersSettings.elementStyles"
        addBandMembersLayoutReadback()
      } else if (nodeId === "contact-bg-image" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "contactSection.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.backgroundImageRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.backgroundImageRef = contactReadback?.backgroundImage?.asset?._ref ?? contactReadback?.backgroundImage?.asset?._id
        addContactLayoutReadback()
      } else if (nodeId === "contact-header-eyebrow" && node.explicitContent) {
        storageTarget = "contactSection.fields"
        expected.eyebrow = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.eyebrow = contactReadback?.eyebrow
        addContactLayoutReadback()
      } else if (nodeId === "contact-header-title" && node.explicitContent) {
        storageTarget = "contactSection.fields"
        expected.title = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.title = contactReadback?.title
        addContactLayoutReadback()
      } else if (nodeId === "contact-header-description" && node.explicitContent) {
        storageTarget = "contactSection.fields"
        expected.description = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.description = contactReadback?.description
        addContactLayoutReadback()
      } else if (nodeId === "contact-middle-text" && node.explicitContent) {
        storageTarget = "contactSection.fields"
        expected.middleText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.middleText = contactReadback?.middleText
        addContactLayoutReadback()
      } else if (nodeId === "contact-email" && node.explicitContent && writeContentKeys.has("href")) {
        storageTarget = "contactSection.contactMethods[0]"
        expected.href = typeof node.content.href === "string" ? node.content.href.trim() : ""
        readBack.href = contactReadback?.contactMethods?.[0]?.href
        addContactLayoutReadback()
      } else if (nodeId === "contact-email-title" && node.explicitContent) {
        storageTarget = "contactSection.contactMethods[0]"
        expected.title = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.title = contactReadback?.contactMethods?.[0]?.title
        addContactLayoutReadback()
      } else if (nodeId === "contact-email-description" && node.explicitContent) {
        storageTarget = "contactSection.contactMethods[0]"
        expected.description = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.description = contactReadback?.contactMethods?.[0]?.description
        addContactLayoutReadback()
      } else if (nodeId === "contact-email-address" && node.explicitContent) {
        storageTarget = "contactSection.contactMethods[0]"
        const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
        expected.label = text
        expected.href = `mailto:${text}`
        readBack.label = contactReadback?.contactMethods?.[0]?.label
        readBack.href = contactReadback?.contactMethods?.[0]?.href
        addContactLayoutReadback()
      } else if (nodeId === "contact-telegram" && node.explicitContent && writeContentKeys.has("href")) {
        storageTarget = "contactSection.contactMethods[1]"
        expected.href = typeof node.content.href === "string" ? node.content.href.trim() : ""
        readBack.href = contactReadback?.contactMethods?.[1]?.href
        addContactLayoutReadback()
      } else if (nodeId === "contact-telegram-title" && node.explicitContent) {
        storageTarget = "contactSection.contactMethods[1]"
        expected.title = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.title = contactReadback?.contactMethods?.[1]?.title
        addContactLayoutReadback()
      } else if (nodeId === "contact-telegram-description" && node.explicitContent) {
        storageTarget = "contactSection.contactMethods[1]"
        expected.description = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.description = contactReadback?.contactMethods?.[1]?.description
        addContactLayoutReadback()
      } else if (nodeId === "contact-telegram-handle" && node.explicitContent) {
        storageTarget = "contactSection.contactMethods[1]"
        expected.label = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.label = contactReadback?.contactMethods?.[1]?.label
        addContactLayoutReadback()
      } else if (isContactNodeIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "contactSection.elementStyles"
        addContactLayoutReadback()
      } else if (nodeId === "footer-logo" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "footerSection.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.logoRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.logoRef = footerReadback?.logo?.asset?._ref ?? footerReadback?.logo?.asset?._id
        addFooterLayoutReadback()
      } else if (nodeId === "footer-description" && node.explicitContent) {
        storageTarget = "footerSection.fields"
        expected.description = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.description = footerReadback?.description
        addFooterLayoutReadback()
      } else if (nodeId === "footer-copyright" && node.explicitContent) {
        storageTarget = "footerSection.fields"
        const text = typeof node.content.text === "string" ? node.content.text.trim() : ""
        expected.copyright = text.replace(/^©\s*/, "")
        readBack.copyright = footerReadback?.copyright
        addFooterLayoutReadback()
      } else if (nodeId === "footer-cta" && node.explicitContent) {
        storageTarget = "footerSection.fields"
        if (writeContentKeys.has("text")) {
          expected.ctaLabel = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.ctaLabel = footerReadback?.ctaLabel
        }
        if (writeContentKeys.has("href")) {
          expected.ctaHref = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack.ctaHref = footerReadback?.ctaHref
        }
        addFooterLayoutReadback()
      } else if (FOOTER_SOCIAL_IDS.has(nodeId) && node.explicitContent && writeContentKeys.has("href")) {
        storageTarget = "footerSection.socialLinks"
        const socialLink = footerReadback?.socialLinks?.find((link) => link.id === nodeId)
        expected.href = typeof node.content.href === "string" ? node.content.href.trim() : ""
        readBack.href = socialLink?.href
        addFooterLayoutReadback()
      } else if (isFooterNodeIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "footerSection.elementStyles"
        addFooterLayoutReadback()
      } else if (shouldVerifyHomeState) {
        storageTarget = "homeEditorState.nodesJson"
        const homeStateNodes = (() => {
          try {
            const parsed = JSON.parse(homeStateReadback?.nodesJson || "[]")
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })() as Array<HomeEditorNodeOverride & { id?: string }>

        const readNode = homeStateNodes.find((n) => {
          const withNodeId = n as HomeEditorNodeOverride & { id?: string }
          return withNodeId.nodeId === nodeId || withNodeId.id === nodeId
        })
        if (!readNode) {
          changedNodesFailed.push(nodeId)
          const mismatchReason = "missing-home-editor-state-node"
          if (!failedNodes.includes(`${nodeId}:${mismatchReason}`)) failedNodes.push(`${nodeId}:${mismatchReason}`)
          verificationByNodeId[nodeId] = {
            storageTarget,
            expected: {},
            readBack: null,
            matched: false,
            mismatchReason,
          }
          continue
        }
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = readNode.geometry?.x
          readBack.y = readNode.geometry?.y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = readNode.geometry?.width
          readBack.height = readNode.geometry?.height
        }
        if (node.explicitStyle) {
          for (const key of writeStyleKeys) {
            expected[`style.${key}`] = normalizeComparableValue(node.style[key as keyof DeployNodePayload["style"]])
            readBack[`style.${key}`] = normalizeComparableValue(readNode.style?.[key as keyof HomeEditorNodeOverride["style"]])
          }
        }
        if (node.explicitContent) {
          for (const key of writeContentKeys) {
            expected[`content.${key}`] = normalizeComparableValue(node.content[key as keyof DeployNodePayload["content"]])
            readBack[`content.${key}`] = normalizeComparableValue(readNode.content?.[key as keyof HomeEditorNodeOverride["content"]])
          }
        }
        expected.explicitContent = node.explicitContent
        expected.explicitStyle = node.explicitStyle
        expected.explicitPosition = node.explicitPosition
        expected.explicitSize = node.explicitSize
        readBack.explicitContent = readNode.explicitContent
        readBack.explicitStyle = readNode.explicitStyle
        readBack.explicitPosition = readNode.explicitPosition
        readBack.explicitSize = readNode.explicitSize
      } else {
        storageTarget = "unknown"
        expected.persistedMarker = true
        readBack.persistedMarker = persistedNodes.some((m) => markerMatchesNode(m, nodeId))
      }

      const comparison = compareMaps(expected, readBack)
      verificationByNodeId[nodeId] = {
        storageTarget,
        expected,
        readBack: Object.keys(readBack).length > 0 ? readBack : null,
        matched: comparison.matched,
        mismatchReason: comparison.mismatchReason,
      }

      if (comparison.matched) {
        changedNodesPersisted.push(nodeId)
      } else {
        changedNodesFailed.push(nodeId)
        const reason = comparison.mismatchReason || "readback-mismatch"
        if (!failedNodes.includes(`${nodeId}:${reason}`)) failedNodes.push(`${nodeId}:${reason}`)
      }
    }

    const heroPatched = Object.keys(heroPatch).length > 0
    const navPatched = navigationDocumentId != null
    const introPatched = introDocumentId != null
    const latestReleasePatched = latestReleaseDocumentId != null
    const livePatched = liveSectionDocumentId != null || liveConcertDocumentIds.length > 0
    const bandMembersPatched = bandMembersDocumentId != null || bandMembersContentPatches.size > 0
    const contactPatched = contactDocumentId != null
    const footerPatched = footerDocumentId != null
    const homeStatePatched = homeEditorStateDocumentId != null
    const publicPropagationConfigured = !!PUBLIC_REVALIDATE_URL || !!VERCEL_DEPLOY_HOOK
    const publicPropagationOk = publicRevalidate.ok || vercelDeploy.ok
    const hasPersistenceIssues = failedNodes.length > 0 || skippedNodes.length > 0 || changedNodesFailed.length > 0
    const parts: string[] = []
    if (heroPatched) parts.push("Hero")
    if (navPatched) parts.push("Navigation")
    if (introPatched) parts.push("Intro banner")
    if (latestReleasePatched) parts.push("Latest Release")
    if (livePatched) parts.push("Live")
    if (bandMembersPatched) parts.push("Band Members")
    if (contactPatched) parts.push("Contact")
    if (footerPatched) parts.push("Footer")
    if (homeStatePatched) parts.push("Home editor state")
    const baseMessage = parts.length > 0
      ? `${parts.join(", ")} updated in Sanity`
      : "No persistible changes detected"
    let deployMessage: string
    if (hasPersistenceIssues) {
      deployMessage = `Deploy partial: ${baseMessage}; ${failedNodes.length} failed node(s), ${skippedNodes.length} skipped node(s).`
    } else if (!publicPropagationConfigured) {
      deployMessage = `Deploy complete: ${baseMessage}; local cache revalidated, but external public propagation is not configured.`
    } else if (!publicPropagationOk) {
      deployMessage = `Deploy complete: ${baseMessage}; external propagation was attempted but did not succeed.`
    } else {
      deployMessage = `Deploy complete: ${baseMessage}; external public propagation triggered.`
    }

    const successResponse = {
      status: hasPersistenceIssues ? "partial" : "ok",
      ok: true,
      step: "done",
      message: deployMessage,
      steps,
      routeVersion: ROUTE_VERSION,
      sanityDocumentId: publishedDocumentId,
      publishedDocumentId,
      publishedDocumentType: SANITY_DOC_TYPE,
      navigationDocumentId: navigationDocumentId ?? undefined,
      introDocumentId: introDocumentId ?? undefined,
      latestReleaseDocumentId: latestReleaseDocumentId ?? undefined,
      liveSectionDocumentId: liveSectionDocumentId ?? undefined,
      liveConcertDocumentIds,
      homeEditorStateDocumentId: homeEditorStateDocumentId ?? undefined,
      targetSection: TARGET_SECTION,
      heroTitleMode,
      revalidatedPath: REVALIDATED_PATH,
      localRevalidateEnabled: SHOULD_REVALIDATE_PATH,
      localRevalidateOk,
      publicRevalidateAttempted: publicRevalidate.attempted,
      publicRevalidateOk: publicRevalidate.ok,
      publicRevalidateMessage: publicRevalidate.message,
      publicRevalidateUrlConfigured: !!PUBLIC_REVALIDATE_URL,
      vercelDeployAttempted: vercelDeploy.attempted,
      vercelDeployOk: vercelDeploy.ok,
      vercelDeployMessage: vercelDeploy.message,
      vercelDeployHookConfigured: !!VERCEL_DEPLOY_HOOK,
      publicPropagationConfigured,
      publicPropagationOk,
      changedNodeIds,
      changedNodesPersisted,
      changedNodesSkipped,
      changedNodesFailed,
      verificationByNodeId,
      persistedNodes,
      skippedNodes,
      failedNodes,
      persistedFields,
      skippedFields,
      diagnostics,
      envDiagnostics,
    }
    log("returning success response", { status: successResponse.status, ok: successResponse.ok })
    return NextResponse.json(successResponse, { status: 200 })
  } catch (error) {
    const elapsed = Date.now() - startTime
    const diagnostics = getEnvDiagnostics()
    const envDiagnostics = diagnostics
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`[editor-deploy ${elapsed}ms] exception:`, message, error)
    return NextResponse.json(
      {
        status: "failed",
        ok: false,
        step: "saving",
        message: `Deploy failed with exception: ${message}`,
        routeVersion: ROUTE_VERSION,
        publishedDocumentId: "resolved-at-deploy",
        publishedDocumentType: SANITY_DOC_TYPE,
        targetSection: TARGET_SECTION,
        heroTitleMode: "unknown",
        revalidatedPath: REVALIDATED_PATH,
        persistedNodes: [],
        skippedNodes: [],
        failedNodes: ["exception"],
        diagnostics,
        envDiagnostics,
      },
      { status: 500 }
    )
  }
}
