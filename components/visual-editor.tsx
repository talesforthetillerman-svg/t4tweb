"use client"
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { MotionConfig } from "framer-motion"
import { TEXT_EMPHASIS_SHADOW, applyScrollIndicatorLayoutToElement, clearScrollIndicatorLayoutFromElement } from "@/lib/hero-layout-styles"

type NodeType = "section" | "background" | "card" | "text" | "button" | "image" | "group" | "overlay"

type Point = { x: number; y: number }

type Size = { width: number; height: number }
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
type ConcertField = "date" | "time" | "locationName" | "locationLink" | "style" | "price" | "status" | "venue" | "city" | "country" | "genre" | "capacity" | "locationUrl"
type LiveConcertEditorItem = {
  _editorId: number
  date: string
  time: string
  locationName: string
  locationLink: string
  style: string
  price: string
  status: string
}

interface TextSegment {
  text: string
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  opacity: number
  fontSize?: string
  fontFamily?: string
  /** Filled gradient on this phrase (matches Sanity + public hero) */
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
}

interface NodeGeometry {
  x: number
  y: number
  width: number
  height: number
}

interface EditorNode {
  id: string
  type: NodeType
  sectionId: string
  label: string
  isGrouped: boolean
  geometry: NodeGeometry
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
    title?: string
    description?: string
    textSegments?: TextSegment[]
    titleSegments?: TextSegment[]
    href?: string
    fileName?: string
    download?: boolean
    assets?: Array<{ label: string; url: string; fileName: string }>
    src?: string
    alt?: string
    role?: string
    email?: string
    videoUrl?: string
    videoSources?: Array<{ type: "youtube"; url: string; youtubeId: string; enabled: boolean; order: number }>
    backgroundVideoSources?: Array<{ type: "youtube"; url: string; youtubeId: string }>
    concerts?: LiveConcertEditorItem[]
    mediaKind?: "image" | "video"
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
    accentText?: string
    accentGradientEnabled?: boolean
    accentGradientStart?: string
    accentGradientEnd?: string
    extraNodeType?: ExtraNodeKind
    parentSection?: string
    label?: string
  }
  explicitContent: boolean
  explicitStyle: boolean
  explicitPosition: boolean
  explicitSize: boolean
}

interface HydratedNodeOverride {
  geometry?: Partial<NodeGeometry>
  style?: Partial<EditorNode["style"]>
  content?: Partial<EditorNode["content"]>
  explicitContent?: boolean
  explicitStyle?: boolean
  explicitPosition?: boolean
  explicitSize?: boolean
}

const BAND_MEMBER_PERSIST_ONLY_NODE_ID = /^member-item-(\d+)-(name|role|number|image)$/

function isPersistOnlyNodeId(nodeId: string): boolean {
  return BAND_MEMBER_PERSIST_ONLY_NODE_ID.test(nodeId)
}

function inferPersistOnlyNodeType(nodeId: string): NodeType {
  return nodeId.endsWith("-image") ? "image" : "text"
}

function createPersistOnlyNode(nodeId: string, hydrated?: HydratedNodeOverride | null): EditorNode {
  return {
    id: nodeId,
    type: inferPersistOnlyNodeType(nodeId),
    sectionId: "band-members-section",
    label: nodeId,
    isGrouped: true,
    geometry: {
      x: typeof hydrated?.geometry?.x === "number" ? hydrated.geometry.x : 0,
      y: typeof hydrated?.geometry?.y === "number" ? hydrated.geometry.y : 0,
      width: typeof hydrated?.geometry?.width === "number" ? hydrated.geometry.width : 0,
      height: typeof hydrated?.geometry?.height === "number" ? hydrated.geometry.height : 0,
    },
    style: { ...(hydrated?.style || {}) },
    content: { ...(hydrated?.content || {}) },
    explicitContent: Boolean(hydrated?.explicitContent),
    explicitStyle: Boolean(hydrated?.explicitStyle),
    explicitPosition: Boolean(hydrated?.explicitPosition),
    explicitSize: Boolean(hydrated?.explicitSize),
  }
}

export interface RuntimeEntry {
  id: string
  type: NodeType
  sectionId: string
  label: string
  isGrouped: boolean
  element: HTMLElement
  rect: DOMRect
  visible: boolean
  eligible: boolean
  transform: { x: number; y: number }
  dimensions: { width: number; height: number }
}

interface LegacyEditable {
  id: string
  type: NodeType
  label: string
  parentId: string | null
  element: HTMLElement | null
  originalRect: DOMRect | null
  transform: { x: number; y: number }
  dimensions: { width: number; height: number }
}

interface AssetItem {
  id: string
  url: string
  filename: string
}

type PrecheckLevel = "green" | "yellow" | "red"

interface PrecheckFinding {
  element: string
  issue: string
  severity: PrecheckLevel
  blocks: boolean
}

interface VisualEditorContextType {
  isEditing: boolean
  isMobileEditBlocked: boolean
  editorBootComplete: boolean
  setIsEditing: (v: boolean) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  openPanel: boolean
  setOpenPanel: (v: boolean) => void
  nodes: Map<string, EditorNode>
  editableElements: Map<string, LegacyEditable>
  registry: Map<string, RuntimeEntry>
  dispatch: (command: Command) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  assets: AssetItem[]
  // legacy no-op compat
  registerEditable: (_: unknown) => void
  unregisterEditable: (_: string) => void
  getElementById: (id: string) => LegacyEditable | undefined
  getEditableAtPosition: (x: number, y: number) => RuntimeEntry | null
}

type Command =
  // Conflict-resolution baseline keeps geometry commit command for resize handles.
  | { type: "SELECT_NODE"; nodeId: string }
  | { type: "DESELECT_NODE" }
  | { type: "MOVE_NODE"; nodeId: string; dx: number; dy: number; transient?: boolean }
  | { type: "RESIZE_NODE"; nodeId: string; width: number; height: number; transient?: boolean }
  | { type: "SET_NODE_GEOMETRY"; nodeId: string; x: number; y: number; width: number; height: number; explicitSize?: boolean; transient?: boolean }
  | { type: "SET_NODE_SCALE"; nodeId: string; scale: number; transient?: boolean }
  | { type: "UPDATE_TEXT"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_BUTTON"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_IMAGE"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_CARD"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_BACKGROUND"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_SECTION"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_GROUP"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "ADD_EXTRA_NODE"; node: EditorNode }
  | { type: "DELETE_NODE"; nodeId: string }
  | { type: "COPY_NODE"; nodeId: string }
  | { type: "CUT_NODE"; nodeId: string }
  | { type: "PASTE_NODE"; targetNodeId?: string }
  | { type: "BEGIN_TRANSACTION" }
  | { type: "END_TRANSACTION" }

const typePriority: Record<NodeType, number> = {
  button: 1,
  text: 2,
  card: 3,
  background: 4,
  section: 5,
  image: 3,
  group: 2,
  overlay: 3,
}


function isEditingInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

function normalizeType(raw: string): NodeType {
  if (raw === "link") return "button"
  if (raw === "box") return "card"
  if (raw === "section" || raw === "background" || raw === "card" || raw === "text" || raw === "button" || raw === "image" || raw === "group" || raw === "overlay") {
    return raw
  }
  return "text"
}

function parseGrouped(value: string | null): boolean {
  return value === "true"
}

function parseDatasetNumber(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseEditorYouTubeId(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return ""
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed) && !trimmed.includes("/")) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || ""
    const queryId = url.searchParams.get("v")
    if (queryId) return queryId
    const pathParts = url.pathname.split("/").filter(Boolean)
    if ((pathParts[0] === "embed" || pathParts[0] === "shorts" || pathParts[0] === "live") && pathParts[1]) {
      return pathParts[1]
    }
    const thumbnailMatch = /\/vi\/([^/?#]+)/.exec(url.pathname)
    if (thumbnailMatch?.[1]) return thumbnailMatch[1]
  } catch {
    return ""
  }
  return ""
}

function getEditorYouTubePreviewSrc(value: string | undefined): string {
  const youtubeId = parseEditorYouTubeId(value)
  return youtubeId ? `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg` : ""
}

function getEditorYouTubeEmbedSrc(value: string | undefined): string {
  const youtubeId = parseEditorYouTubeId(value)
  if (!youtubeId) return ""
  const encodedId = encodeURIComponent(youtubeId)
  return `https://www.youtube-nocookie.com/embed/${encodedId}?autoplay=1&mute=1&loop=1&playlist=${encodedId}&controls=0&rel=0&modestbranding=1&playsinline=1`
}

function normalizeEditorVideoSources(sources: Array<{ type?: string; url?: string; youtubeId?: string; enabled?: boolean; order?: number }>): Array<{ type: "youtube"; url: string; youtubeId: string; enabled: boolean; order: number }> {
  return sources
    .map((source, index) => {
      const url = typeof source.url === "string" ? source.url.trim() : ""
      const youtubeId = parseEditorYouTubeId(url) || (typeof source.youtubeId === "string" ? source.youtubeId.trim() : "")
      if (!url || !youtubeId) return null
      const order = typeof source.order === "number" && Number.isFinite(source.order) ? source.order : index + 1
      return {
        type: "youtube" as const,
        url,
        youtubeId,
        enabled: typeof source.enabled === "boolean" ? source.enabled : true,
        order,
      }
    })
    .filter((source): source is { type: "youtube"; url: string; youtubeId: string; enabled: boolean; order: number } => source !== null)
    .sort((a, b) => a.order - b.order)
    .map((source, index) => ({ ...source, order: index + 1 }))
    .slice(0, 3)
}

function parseEditorVideoSources(value: string | undefined): Array<{ type: "youtube"; url: string; youtubeId: string; enabled: boolean; order: number }> {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return normalizeEditorVideoSources(parsed as Array<{ type?: string; url?: string; youtubeId?: string; enabled?: boolean; order?: number }>)
  } catch {
    return []
  }
}

function readHydratedNodeOverride(nodeId: string): HydratedNodeOverride | null {
  if (typeof window === "undefined") return null
  const bag = (window as Window & { __HOME_EDITOR_NODE_OVERRIDES__?: Record<string, HydratedNodeOverride> }).__HOME_EDITOR_NODE_OVERRIDES__
  if (!bag || typeof bag !== "object") return null
  const value = bag[nodeId]
  return value && typeof value === "object" ? value : null
}

function extractConcertCardId(nodeId: string | null | undefined): string | null {
  if (!nodeId) return null
  const direct = nodeId.match(/^live-(upcoming|history)-event-(\d+)$/)
  if (direct) return nodeId
  const nested = nodeId.match(/^live-(upcoming|history)-event-(\d+)-/)
  if (!nested) return null
  return `live-${nested[1]}-event-${nested[2]}`
}

function extractBandMemberIndex(nodeId: string | null | undefined): number | null {
  if (!nodeId) return null
  const match = /^member-item-(\d+)(?:-(name|role|number|image))?$/.exec(nodeId)
  if (!match) return null
  const index = Number(match[1])
  return Number.isFinite(index) ? index : null
}

const TEXT_TOOL_EXACT_IDS = new Set<string>([
  "nav-brand-name",
  "hero-title",
  "hero-subtitle",
  "hero-scroll-label",
  "intro-banner-text",
  "intro-book-button",
  "intro-press-button",
  "latest-release-title",
  "latest-release-subtitle",
  "latest-release-watch-button",
  "latest-release-shows-button",
  "about-header-eyebrow",
  "about-header-title",
  "about-text-1",
  "about-text-2",
  "about-tags",
  "about-copy-button",
  "band-members-header-eyebrow",
  "band-members-header-title",
  "band-members-header-description",
  "press-kit-title",
  "press-kit-description",
  "press-kit-download-button",
  "contact-header-eyebrow",
  "contact-header-title",
  "contact-header-description",
  "contact-email-title",
  "contact-email-description",
  "contact-email-address",
  "contact-middle-text",
  "contact-telegram-title",
  "contact-telegram-description",
  "contact-telegram-handle",
  "footer-copyright",
  "footer-description",
  "footer-cta",
])

const HERO_TEXT_PATTERN_NODE_IDS = new Set<string>([
  "hero-title",
  "hero-subtitle",
  "hero-scroll-label",
])

const NAVBAR_TEXT_PATTERN_NODE_IDS = new Set<string>([
  "nav-brand-name",
  "nav-book-button",
  "nav-mobile-book-button",
])

const EXTRA_NODE_PREFIX = "extra-"
type ExtraNodeKind = "text" | "button" | "card" | "overlay"

const EXTRA_NODE_LIMITS: Record<ExtraNodeKind, number> = {
  text: 6,
  button: 4,
  card: 4,
  overlay: 3,
}

const TEXT_FONT_OPTIONS = [
  { label: "Factory / Inherit", value: "inherit" },
  { label: "Factory Sans (Hero title/subtitle)", value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Factory Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans Serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Impact", value: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
  { label: "Monospace", value: "monospace" },
  { label: "Courier", value: "'Courier New', Courier, monospace" },
  { label: "Cursive", value: "cursive" },
]

function isExtraNodeId(nodeId: string): boolean {
  return nodeId.startsWith(EXTRA_NODE_PREFIX)
}

function getExtraNodeKind(node: EditorNode): ExtraNodeKind | null {
  if (!isExtraNodeId(node.id)) return null
  if (node.type === "text" || node.type === "button" || node.type === "card" || node.type === "overlay") return node.type
  return null
}

function createExtraNodeFromHydrated(nodeId: string, hydrated: HydratedNodeOverride): EditorNode | null {
  const content = (hydrated.content || {}) as Record<string, unknown>
  const style = (hydrated.style || {}) as Record<string, unknown>
  const type = content.extraNodeType || style.extraNodeType || (hydrated as HydratedNodeOverride & { nodeType?: unknown }).nodeType
  const normalizedType = typeof type === "string" ? normalizeType(type) : normalizeType(String(content.type || "text"))
  if (normalizedType !== "text" && normalizedType !== "button" && normalizedType !== "card" && normalizedType !== "overlay") return null
  const sectionId = typeof content.parentSection === "string" ? content.parentSection : "root"

  return {
    id: nodeId,
    type: normalizedType,
    sectionId,
    label: typeof content.label === "string" ? content.label : `Extra ${normalizedType}`,
    isGrouped: false,
    geometry: {
      x: typeof hydrated.geometry?.x === "number" ? hydrated.geometry.x : 32,
      y: typeof hydrated.geometry?.y === "number" ? hydrated.geometry.y : 32,
      width: typeof hydrated.geometry?.width === "number" ? hydrated.geometry.width : normalizedType === "button" ? 164 : 260,
      height: typeof hydrated.geometry?.height === "number" ? hydrated.geometry.height : normalizedType === "button" ? 48 : 80,
    },
    style: { ...(hydrated.style || {}) },
    content: { ...(hydrated.content || {}) },
    explicitContent: Boolean(hydrated.explicitContent),
    explicitStyle: Boolean(hydrated.explicitStyle),
    explicitPosition: Boolean(hydrated.explicitPosition),
    explicitSize: Boolean(hydrated.explicitSize),
  }
}

function isNavbarTextPatternNodeId(nodeId: string): boolean {
  return NAVBAR_TEXT_PATTERN_NODE_IDS.has(nodeId) || /^nav-(?:mobile-)?link-\d+$/.test(nodeId)
}

function isNavbarOrHeroTextPatternNodeId(nodeId: string): boolean {
  return HERO_TEXT_PATTERN_NODE_IDS.has(nodeId) || isNavbarTextPatternNodeId(nodeId)
}

function supportsTextShadowTool(nodeId: string): boolean {
  return (
    isNavbarOrHeroTextPatternNodeId(nodeId) ||
    nodeId === "intro-banner-text" ||
    nodeId === "intro-book-button" ||
    nodeId === "intro-press-button" ||
    nodeId === "latest-release-title" ||
    nodeId === "latest-release-subtitle" ||
    nodeId === "latest-release-watch-button" ||
    nodeId === "latest-release-shows-button" ||
    nodeId === "about-header-eyebrow" ||
    nodeId === "about-header-title" ||
    nodeId === "about-text-1" ||
    nodeId === "about-text-2" ||
    nodeId === "about-tags" ||
    nodeId === "about-copy-button" ||
    nodeId === "band-members-header-eyebrow" ||
    nodeId === "band-members-header-title" ||
    nodeId === "band-members-header-description" ||
    /^member-item-\d+-(?:name|role|number)$/.test(nodeId) ||
    nodeId === "press-kit-title" ||
    nodeId === "press-kit-description" ||
    nodeId === "press-kit-download-button" ||
    isExtraNodeId(nodeId)
  )
}

function hasUsableAboutCopyButtonGeometry(geometry: Partial<NodeGeometry> | null | undefined): boolean {
  const width = geometry?.width
  const height = geometry?.height
  const x = geometry?.x
  const y = geometry?.y
  if (typeof width === "number" && width < 48) return false
  if (typeof height === "number" && height < 24) return false
  if (typeof x === "number" && Math.abs(x) > 900) return false
  if (typeof y === "number" && Math.abs(y) > 480) return false
  return true
}

const HERO_IMAGE_FILTER_DEFAULTS = {
  contrast: 100,
  saturation: 100,
  brightness: 100,
  opacity: 1,
  negative: false,
} satisfies Pick<EditorNode["style"], "contrast" | "saturation" | "brightness" | "opacity" | "negative">

function isUsableHeroTextGeometry(geometry: Partial<NodeGeometry> | null | undefined): boolean {
  const x = geometry?.x
  const y = geometry?.y
  const width = geometry?.width
  const height = geometry?.height

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

function getSelectionOverlayTheme(entry: RuntimeEntry): { borderClass: string; handleClass: string } {
  if (entry.id === "about-text-card") {
    return {
      borderClass: "border-[#38bdf8] shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_12px_rgba(56,189,248,0.2)]",
      handleClass: "bg-[#38bdf8]",
    }
  }
  if (entry.type === "section") {
    return {
      borderClass: "border-[#22c55e] shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_0_12px_rgba(34,197,94,0.2)]",
      handleClass: "bg-[#22c55e]",
    }
  }
  if (entry.type === "background" || entry.type === "image") {
    return {
      borderClass: "border-[#FF8C21] shadow-[0_0_0_1px_rgba(255,140,33,0.3),0_0_12px_rgba(255,140,33,0.15)]",
      handleClass: "bg-[#FF8C21]",
    }
  }
  return {
    borderClass: "border-[#FF8C21] shadow-[0_0_0_1px_rgba(255,140,33,0.3),0_0_12px_rgba(255,140,33,0.15)]",
    handleClass: "bg-[#FF8C21]",
  }
}

const NAVBAR_BUTTON_TEXT_TOOL_IDS = new Set<string>([
  "nav-book-button",
  "nav-mobile-book-button",
])

function isNavbarLinkButtonNodeId(nodeId: string): boolean {
  return /^nav-(?:mobile-)?link-\d+$/.test(nodeId)
}

function isNavbarTextOrButtonPatternNode(node: EditorNode): boolean {
  return node.id === "nav-brand-name" || NAVBAR_BUTTON_TEXT_TOOL_IDS.has(node.id) || isNavbarLinkButtonNodeId(node.id)
}

function hasRealTextToolingWriter(node: EditorNode | null): boolean {
  if (!node) return false
  if (node.type !== "text" && node.type !== "button") return false
  if (isExtraNodeId(node.id)) return true
  if (isNavbarTextOrButtonPatternNode(node)) return true
  if (TEXT_TOOL_EXACT_IDS.has(node.id)) return true
  if (/^live-(?:upcoming|history)-event-\d+-(?:date|time|locationName|locationLink|style|price|status|venue|city|country|genre|capacity|locationUrl)$/.test(node.id)) return true
  if (/^live-(?:upcoming|history|stream|social)-/.test(node.id)) return true
  if (/^member-item-\d+-(?:name|role|number)$/.test(node.id)) return true
  return false
}

function getConcertFieldFromNodeContent(node: EditorNode | null, field: ConcertField): string {
  if (!node) return ""
  const value = node.content[field as keyof EditorNode["content"]]
  return typeof value === "string" ? value : ""
}

function parseLiveConcertsDataset(value: string | undefined): LiveConcertEditorItem[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return null
        const record = item as Record<string, unknown>
        const editorId = typeof record._editorId === "number" ? record._editorId : index
        return {
          _editorId: editorId,
          date: typeof record.date === "string" ? record.date : "",
          time: typeof record.time === "string" ? record.time : "",
          locationName: typeof record.locationName === "string" ? record.locationName : typeof record.venue === "string" ? record.venue : "",
          locationLink: typeof record.locationLink === "string" ? record.locationLink : typeof record.locationUrl === "string" ? record.locationUrl : "",
          style: typeof record.style === "string" ? record.style : typeof record.genre === "string" ? record.genre : "World Music",
          price: typeof record.price === "string" ? record.price : typeof record.price === "number" ? String(record.price) : "",
          status: typeof record.status === "string" ? record.status : "Upcoming",
        }
      })
      .filter((item): item is LiveConcertEditorItem => Boolean(item))
  } catch {
    return []
  }
}

function emitLiveConcertsUpdated(concerts: LiveConcertEditorItem[]): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("live-concerts-updated", { detail: { concerts } }))
}

function rgbToHex(rgb: string): string {
  if (!rgb) return "#ffffff"
  if (rgb.startsWith("#")) return rgb
  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return "#ffffff"
  const [r, g, b] = match.slice(0, 3).map(Number)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function parseCssColor(input: string | undefined): { r: number; g: number; b: number; a: number } | null {
  if (!input) return null
  const color = input.trim()
  if (!color) return null
  if (color.startsWith("#")) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16)
      const g = Number.parseInt(hex[1] + hex[1], 16)
      const b = Number.parseInt(hex[2] + hex[2], 16)
      return { r, g, b, a: 1 }
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16)
      const g = Number.parseInt(hex.slice(2, 4), 16)
      const b = Number.parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1
      return { r, g, b, a }
    }
    return null
  }
  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/i)
  if (!rgbaMatch) return null
  const parts = rgbaMatch[1].split(",").map((part) => part.trim())
  if (parts.length < 3) return null
  const r = Number(parts[0])
  const g = Number(parts[1])
  const b = Number(parts[2])
  const a = parts[3] !== undefined ? Number(parts[3]) : 1
  if (![r, g, b, a].every((value) => Number.isFinite(value))) return null
  return { r, g, b, a: Math.max(0, Math.min(1, a)) }
}

function withColorOpacity(input: string, opacity: number): string {
  const parsed = parseCssColor(input)
  if (!parsed) return input
  const alpha = Math.max(0, Math.min(1, opacity))
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha.toFixed(3)})`
}

function readColorOpacity(input: string | undefined): number {
  const parsed = parseCssColor(input)
  return parsed?.a ?? 1
}

function readColorHex(input: string | undefined, fallback: string): string {
  const parsed = input ? parseCssColor(input) : null
  if (!parsed) return fallback
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")
  return `#${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}`
}

function buildBoxOpacityPatch(nodeId: string, opacity: number): Partial<EditorNode["style"]> {
  if (typeof document === "undefined") return { backgroundColor: `rgba(0,0,0,${opacity})` }
  const el = document.querySelector<HTMLElement>(`[data-editor-node-id="${nodeId}"]`)
  const computed = el ? getComputedStyle(el).backgroundColor : undefined
  const current = computed && computed !== "rgba(0, 0, 0, 0)" ? computed : undefined
  if (!current) return { backgroundColor: `rgba(0,0,0,${opacity})` }
  // Apply opacity only to background color, not to the element itself (preserves text/icon opacity)
  return { backgroundColor: withColorOpacity(current, opacity) }
}

function isPersistableImageSrc(value: string | undefined): boolean {
  if (!value) return false
  const src = value.trim()
  if (!src) return false
  if (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("javascript:")) return false
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")
}

function isElementTreeVisible(el: HTMLElement): boolean {
  let current: HTMLElement | null = el
  while (current && current !== document.body) {
    const style = getComputedStyle(current)
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") <= 0.01) {
      return false
    }
    current = current.parentElement
  }
  return true
}

const VisualEditorContext = createContext<VisualEditorContextType>({
  isEditing: false,
  isMobileEditBlocked: false,
  editorBootComplete: false,
  setIsEditing: () => {},
  selectedId: null,
  setSelectedId: () => {},
  openPanel: false,
  setOpenPanel: () => {},
  nodes: new Map(),
  editableElements: new Map(),
  registry: new Map(),
  dispatch: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
  assets: [],
  registerEditable: () => {},
  unregisterEditable: () => {},
  getElementById: () => undefined,
  getEditableAtPosition: () => null,
})

export function useVisualEditor() {
  return useContext(VisualEditorContext)
}

function scanRegistry(): Map<string, RuntimeEntry> {
  const map = new Map<string, RuntimeEntry>()
  const elements = document.querySelectorAll<HTMLElement>("[data-editor-node-id]")
  elements.forEach((el) => {
    if (el.dataset.editorDeleted === "true") return
    const id = el.dataset.editorNodeId
    if (!id) return
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const visible = style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity || "1") > 0 && isElementTreeVisible(el)
    const type = normalizeType(el.dataset.editorNodeType || "text")
    const sectionId = el.dataset.editorSectionId || "root"
    const label = el.dataset.editorNodeLabel || id
    const isGrouped = parseGrouped(el.dataset.editorGrouped || null)
    map.set(id, {
      id,
      type,
      sectionId,
      label,
      isGrouped,
      element: el,
      rect,
      visible,
      eligible: visible,
      transform: { x: 0, y: 0 },
      dimensions: { width: rect.width, height: rect.height },
    })
  })
  return map
}

function areRuntimeEntriesEquivalent(a: RuntimeEntry, b: RuntimeEntry): boolean {
  return (
    a.id === b.id &&
    a.type === b.type &&
    a.sectionId === b.sectionId &&
    a.label === b.label &&
    a.isGrouped === b.isGrouped &&
    a.element === b.element &&
    a.visible === b.visible &&
    a.eligible === b.eligible
  )
}

function areRegistryMapsEquivalent(a: Map<string, RuntimeEntry>, b: Map<string, RuntimeEntry>): boolean {
  if (a.size !== b.size) return false
  for (const [id, entryA] of a) {
    const entryB = b.get(id)
    if (!entryB) return false
    if (!areRuntimeEntriesEquivalent(entryA, entryB)) return false
  }
  return true
}

function areNodeMapsReferenceEqual(a: Map<string, EditorNode>, b: Map<string, EditorNode>): boolean {
  if (a.size !== b.size) return false
  for (const [id, nodeA] of a) {
    if (b.get(id) !== nodeA) return false
  }
  return true
}

function buildNodeFromEntry(entry: RuntimeEntry): EditorNode {
  const el = entry.element
  const hydrated = readHydratedNodeOverride(entry.id)
  const content: EditorNode["content"] = {}
  const isStructuredConcertCard =
    entry.type === "card" && (el.dataset.concertCard === "true" || Boolean(el.querySelector("[data-concert-field]")))
  if (entry.type === "text" || entry.type === "button" || entry.type === "card") {
    content.text = el.textContent?.trim() || ""
    if (entry.id === "hero-subtitle") {
      let loadedFromDataset = false
      const encodedSegments = el.dataset.editorTitleSegments
      if (encodedSegments) {
        try {
          const parsed = JSON.parse(encodedSegments) as TextSegment[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            content.titleSegments = parsed
            content.textSegments = parsed
            loadedFromDataset = true
          }
        } catch {
          // fall through to DOM extraction
        }
      }
      if (!loadedFromDataset) {
      const baseStyle = getComputedStyle(el)
      const baseSegment: TextSegment = {
        text: (el.textContent || "").trim(),
        color: rgbToHex(baseStyle.color),
        bold: Number(baseStyle.fontWeight || "400") >= 600,
        italic: baseStyle.fontStyle === "italic",
        underline: (baseStyle.textDecorationLine || "").includes("underline"),
        opacity: Number(baseStyle.opacity || "1"),
        fontSize: baseStyle.fontSize,
        fontFamily: baseStyle.fontFamily,
      }
      const segments: TextSegment[] = []

      el.childNodes.forEach((child) => {
        if (child.nodeType !== Node.ELEMENT_NODE) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim()
            if (text) segments.push({ ...baseSegment, text })
          }
          return
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as HTMLElement
          const childText = childEl.textContent?.trim()
          if (!childText) return
          const childStyle = getComputedStyle(childEl)
          segments.push({
            text: childText,
            color: rgbToHex(childStyle.color),
            bold: Number(childStyle.fontWeight || "400") >= 600,
            italic: childStyle.fontStyle === "italic",
            underline: (childStyle.textDecorationLine || "").includes("underline"),
            opacity: Number(childStyle.opacity || "1"),
            fontSize: childStyle.fontSize,
            fontFamily: childStyle.fontFamily,
          })
        }
      })
      const normalizedSegments = segments.filter((segment) => segment.text.length > 0)
      if (normalizedSegments.length > 1) {
        content.titleSegments = normalizedSegments
        content.textSegments = normalizedSegments
      }
      }
    }
  }
  if (entry.id === "live-section-concerts-container") {
    content.concerts = parseLiveConcertsDataset(el.dataset.liveConcerts)
  }
  if (isStructuredConcertCard) {
    const editorId = Number(el.dataset.concertId || entry.id.match(/event-(\d+)/)?.[1] || 0)
    const getField = (field: ConcertField): string =>
      el.querySelector<HTMLElement>(`[data-concert-field="${field}"]`)?.textContent?.trim() || ""
    content.concerts = [{
      _editorId: Number.isFinite(editorId) ? editorId : 0,
      date: getField("date"),
      time: getField("time"),
      locationName: getField("locationName") || getField("venue"),
      locationLink: getField("locationLink") || getField("locationUrl"),
      style: getField("style") || getField("genre") || "World Music",
      price: getField("price").replace(/^€/, ""),
      status: entry.id.includes("-history-") ? "Completed" : "Upcoming",
    }]
  }
  if (entry.type === "button") {
    content.href = el.getAttribute("href") || ""
    if (el.dataset.editorDownloadName) content.fileName = el.dataset.editorDownloadName
  }
  if (/^press-kit-resource-\d+$/.test(entry.id)) {
    content.title = el.querySelector<HTMLElement>("[data-editor-resource-title]")?.textContent?.trim() || ""
    content.description = el.querySelector<HTMLElement>("[data-editor-resource-description]")?.textContent?.trim() || ""
    try {
      const parsed = JSON.parse(el.dataset.editorResourceAssets || "[]") as Array<{ label?: string; url?: string; fileName?: string }>
      content.assets = Array.isArray(parsed)
        ? parsed
          .map((asset) => ({
            label: typeof asset.label === "string" ? asset.label : "Asset",
            url: typeof asset.url === "string" ? asset.url : "",
            fileName: typeof asset.fileName === "string" ? asset.fileName : "",
          }))
          .filter((asset) => asset.url)
        : []
    } catch {
      content.assets = []
    }
  }
  if (entry.id === "press-kit-manager") {
    content.title = el.querySelector<HTMLElement>("[data-editor-manager-title]")?.textContent?.trim() || ""
    content.text = el.querySelector<HTMLElement>("[data-editor-manager-name]")?.textContent?.trim() || ""
    content.role = el.dataset.editorManagerRole || ""
    content.email = el.dataset.editorManagerEmail || ""
    content.src = el.dataset.editorManagerPhoto || ""
  }
  if (entry.type === "image" || entry.type === "background") {
    const img = el.tagName === "IMG" ? (el as HTMLImageElement) : el.querySelector("img")
    content.src = img?.getAttribute("src") || ""
    content.alt = img?.getAttribute("alt") || ""
    if (entry.type === "background") {
      const iframe = el.querySelector("iframe")
      const mediaKindAttr = el.dataset.editorMediaKind
      if (mediaKindAttr === "video" || iframe) {
        content.mediaKind = "video"
      } else {
        content.mediaKind = "image"
      }
      const parsedSources = parseEditorVideoSources(el.dataset.editorVideoSources)
      const videoUrl = iframe?.getAttribute("src") || el.dataset.editorVideoUrl || parsedSources[0]?.url || content.src || ""
      content.videoUrl = videoUrl
      content.videoSources = parsedSources.length > 0
        ? parsedSources
        : normalizeEditorVideoSources([{ type: "youtube", url: videoUrl }])
    }
  }
  const cs = getComputedStyle(el)
  const explicitContent = hydrated?.explicitContent ?? (el.dataset.editorExplicitContent === "true")
  const explicitStyle = hydrated?.explicitStyle ?? (el.dataset.editorExplicitStyle === "true")
  let explicitPosition = hydrated?.explicitPosition ?? (el.dataset.editorExplicitPosition === "true")
  let explicitSize = hydrated?.explicitSize ?? (el.dataset.editorExplicitSize === "true")
  const geometryX = parseDatasetNumber(el.dataset.editorGeometryX)
  const geometryY = parseDatasetNumber(el.dataset.editorGeometryY)
  const geometryWidth = parseDatasetNumber(el.dataset.editorGeometryWidth)
  const geometryHeight = parseDatasetNumber(el.dataset.editorGeometryHeight)
  const hydratedGeometry = hydrated?.geometry || null
  const hydratedStyle = hydrated?.style || null
  const hydratedContent = hydrated?.content || null
  const isHeroTextPatternNode = HERO_TEXT_PATTERN_NODE_IDS.has(entry.id)
  const hasUsableHydratedHeroTextGeometry = isHeroTextPatternNode && isUsableHeroTextGeometry(hydratedGeometry)
  const isAboutCopyButtonNode = entry.id === "about-copy-button"
  const hasUsableHydratedAboutCopyButtonGeometry = isAboutCopyButtonNode && hasUsableAboutCopyButtonGeometry(hydratedGeometry)
  const hydratedGeometryForNode =
    (isHeroTextPatternNode && !hasUsableHydratedHeroTextGeometry) ||
    (isAboutCopyButtonNode && !hasUsableHydratedAboutCopyButtonGeometry)
      ? null
      : hydratedGeometry
  const hydratedStyleForNode = isHeroTextPatternNode
    ? (() => {
      const textStyle = { ...(hydratedStyle || {}) }
      if (!hasUsableHydratedHeroTextGeometry) delete textStyle.scale
      delete textStyle.minHeight
      delete textStyle.paddingTop
      delete textStyle.paddingBottom
        return textStyle
      })()
    : hydratedStyle

  // HERO NODES FIX: If hero node has persisted geometry but explicitPosition=false,
  // force explicitPosition=true so applyNodeToDom applies the transform
  const HERO_NODE_IDS_TO_FIX = new Set(["hero-scroll-indicator", "hero-logo", "hero-bg-image"])
  if (HERO_NODE_IDS_TO_FIX.has(entry.id) && !explicitPosition && hydratedGeometry && (hydratedGeometry.x !== 0 || hydratedGeometry.y !== 0)) {
    explicitPosition = true
  }
  if (isHeroTextPatternNode) {
    explicitPosition = hasUsableHydratedHeroTextGeometry && explicitPosition
    explicitSize = hasUsableHydratedHeroTextGeometry && explicitSize
  }
  if (isAboutCopyButtonNode && !hasUsableHydratedAboutCopyButtonGeometry) {
    explicitPosition = false
    explicitSize = false
  }

  return {
    id: entry.id,
    type: entry.type,
    sectionId: entry.sectionId,
    label: entry.label,
    isGrouped: entry.isGrouped,
    geometry: {
      x: (typeof hydratedGeometryForNode?.x === "number" ? hydratedGeometryForNode.x : null) ?? geometryX ?? 0,
      y: (typeof hydratedGeometryForNode?.y === "number" ? hydratedGeometryForNode.y : null) ?? geometryY ?? 0,
      width: (typeof hydratedGeometryForNode?.width === "number" ? hydratedGeometryForNode.width : null) ?? geometryWidth ?? entry.rect.width,
      height: (typeof hydratedGeometryForNode?.height === "number" ? hydratedGeometryForNode.height : null) ?? geometryHeight ?? entry.rect.height,
    },
    style: {
      color: rgbToHex(cs.color),
      backgroundColor: cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? rgbToHex(cs.backgroundColor) : undefined,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textDecoration: cs.textDecorationLine,
      textAlign: cs.textAlign === "center" || cs.textAlign === "right" ? cs.textAlign : "left",
      scale: 1,
      minHeight: cs.minHeight,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      ...(hydratedStyleForNode || {}),
    },
    // Merge hydratedContent for fields that cannot be read from the DOM
    // (e.g. gradientEnabled, gradientStart, gradientEnd, concert data).
    // DOM-read fields in `content` override hydrated ones; hydrated supplies
    // anything the DOM extraction cannot see.
    content: { ...(hydratedContent || {}), ...content } as EditorNode["content"],
    explicitContent,
    explicitStyle,
    explicitPosition,
    explicitSize,
  }
}

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isMobileEditBlocked, setIsMobileEditBlocked] = useState(false)
  const [editorBootComplete, setEditorBootComplete] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openPanel, setOpenPanel] = useState(false)
  const [nodes, setNodes] = useState<Map<string, EditorNode>>(new Map())
  const [registry, setRegistry] = useState<Map<string, RuntimeEntry>>(new Map())
  const [history, setHistory] = useState<Map<string, EditorNode>[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const clipboardRef = useRef<EditorNode | null>(null)
  const registryRafRef = useRef<number | null>(null)
  const historyRef = useRef<Map<string, EditorNode>[]>([])
  const historyIndexRef = useRef(-1)
  const transactionRef = useRef<{ active: boolean; baseline: Map<string, EditorNode> | null }>({ active: false, baseline: null })
  const deletedIdsRef = useRef<Set<string>>(new Set())
  const refreshRegistry = useCallback(() => {
    const nextRegistry = scanRegistry()
    setRegistry((prev) => (areRegistryMapsEquivalent(prev, nextRegistry) ? prev : nextRegistry))
  }, [])

  const assets = useMemo<AssetItem[]>(() => {
    if (typeof document === "undefined") return []
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img[src]"))
    return imgs.map((img, i) => ({ id: `${i}-${img.src}`, url: img.src, filename: img.src.split("/").pop() || `asset-${i}` }))
  }, [isEditing])

  const snapshot = useCallback((state: Map<string, EditorNode>) => {
    const base = historyRef.current.slice(0, historyIndexRef.current + 1)
    base.push(new Map(state))
    if (base.length > 80) {
      base.shift()
    }
    historyRef.current = base
    historyIndexRef.current = base.length - 1
    setHistory(base)
    setHistoryIndex(base.length - 1)
  }, [])

  useEffect(() => {
    // Set isHydrated first - don't activate editor until hydration is complete
  }, [])

  // Single synchronous hydration and editor activation effect
  // This runs once after the first client-side render to establish isHydrated and isEditing state
  // without setTimeout delays that cause cascading visual changes during boot
  useEffect(() => {
    const t = new Date().toISOString()
    console.log(`[BOOT-PHASE1] ${t} - First useEffect running (no deps)`)

    // Mark as hydrated after first client-side render to prevent hydration mismatches
    setIsHydrated(true)

    // ONLY activate editor on /editor route - ignore ?editMode=true query param completely
    const isEditorRoute = window.location.pathname === "/editor"
    const wantsEditMode = isEditorRoute
    console.log(`[BOOT-PHASE1] ${t} - isEditorRoute=${isEditorRoute}`)

    if (!wantsEditMode) {
      console.log(`[BOOT-PHASE1] ${t} - Not editor route, setting isEditing=false`)
      setIsEditing(false)
      setIsMobileEditBlocked(false)
      return
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    if (mediaQuery.matches) {
      console.log(`[BOOT-PHASE1] ${t} - Desktop detected, setting isEditing=true`)
      setIsEditing(true)
      setIsMobileEditBlocked(false)
    } else {
      console.log(`[BOOT-PHASE1] ${t} - Mobile detected, setting isEditing=false`)
      setIsEditing(false)
      setIsMobileEditBlocked(true)
    }
  }, [])

  // Track if nodes have been built to prevent double-building on isEditing transitions
  const nodesBuiltRef = useRef(false)

  useEffect(() => {
    const t = new Date().toISOString()
    if (!isEditing || !isHydrated) {
      console.log(`[BOOT-PHASE2] ${t} - Condition not met. isEditing=${isEditing}, isHydrated=${isHydrated}`)
      return
    }
    // Skip if already built - only build once after hydration to prevent re-extracting DOM content
    if (nodesBuiltRef.current) {
      console.log(`[BOOT-PHASE2] ${t} - Already built, skipping`)
      return
    }
    nodesBuiltRef.current = true

    console.log(`[BOOT-PHASE2] ${t} - Node scan starting`)

    // CRITICAL: Always scan DOM fresh, never restore from sessionStorage
    // sessionStorage is session-relative persistence only, not cross-session
    // Cross-session data comes from Sanity, not from browser storage
    refreshRegistry()
    const nextNodes = new Map<string, EditorNode>()

    // Always use fresh DOM scan - no sessionStorage restore
    console.log(`[BOOT-PHASE2] ${t} - Scanning DOM for all [data-editor-node-id] elements...`)
    const registry = scanRegistry()
    const nodeIds = Array.from(registry.keys())
    console.log(`[BOOT-PHASE2] ${t} - scanRegistry() found ${registry.size} nodes:`, nodeIds)

    // Categorize found nodes for debugging
    const heroNodes = nodeIds.filter(id => id.startsWith('hero-'))
    const navNodes = nodeIds.filter(id => id.startsWith('nav-'))
    const otherNodes = nodeIds.filter(id => !id.startsWith('hero-') && !id.startsWith('nav-'))
    console.log(`[BOOT-PHASE2] ${t} - Categories:`, { heroNodes: heroNodes.length, navNodes: navNodes.length, other: otherNodes.length })

    registry.forEach((entry, id) => {
      nextNodes.set(id, buildNodeFromEntry(entry))
    })

    // Keep persisted nodes that intentionally have no direct DOM editable target
    // (band member split fields edited from the custom panel).
    if (typeof window !== "undefined") {
      const bag = (window as Window & { __HOME_EDITOR_NODE_OVERRIDES__?: Record<string, HydratedNodeOverride> }).__HOME_EDITOR_NODE_OVERRIDES__
      if (bag && typeof bag === "object") {
        Object.entries(bag).forEach(([id, hydrated]) => {
          if (nextNodes.has(id)) return
          if (isExtraNodeId(id)) {
            const extraNode = createExtraNodeFromHydrated(id, hydrated)
            if (extraNode) nextNodes.set(id, extraNode)
            return
          }
          if (!isPersistOnlyNodeId(id)) return
          nextNodes.set(id, createPersistOnlyNode(id, hydrated))
        })
      }
    }
    console.log(`[BOOT-PHASE2] ${t} - Built nodes, calling setNodes(${nextNodes.size})`)
    setNodes(nextNodes)
    snapshot(nextNodes)
    // Mark editor boot as complete after initial node scan
    console.log(`[BOOT-PHASE2] ${t} - Boot complete. Nodes: ${nextNodes.size}. Calling setEditorBootComplete(true)`)
    setEditorBootComplete(true)
  }, [isEditing, isHydrated, snapshot, refreshRegistry])

  // Reset boot complete flag and clear session state when editor closes
  useEffect(() => {
    if (!isEditing) {
      setEditorBootComplete(false)
      // Clear session state when exiting editor
      // This prevents old session data from contaminating next session
      try {
        if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
          window.sessionStorage.removeItem("__VISUAL_EDITOR_SESSION_STATE__")
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, [isEditing])

  const extraNodeRegistrySignature = Array.from(nodes.keys()).filter(isExtraNodeId).sort().join("|")

  useEffect(() => {
    if (!isEditing || !isHydrated || !nodesBuiltRef.current || !extraNodeRegistrySignature) return
    const timeout = window.setTimeout(() => setRegistry(scanRegistry()), 0)
    return () => window.clearTimeout(timeout)
  }, [isEditing, isHydrated, extraNodeRegistrySignature])

  // Boot timeout: if editorBootComplete not set within 30 seconds, something is wrong
  useEffect(() => {
    if (!isEditing || !isHydrated || editorBootComplete) return

    const timeout = setTimeout(() => {
      console.error('[BOOT] Timeout: Editor boot did not complete within 30 seconds')
      console.error('[BOOT] This indicates scanRegistry() failed or nodes could not be loaded')
      // Reset nodesBuiltRef to allow retry on refresh
      nodesBuiltRef.current = false
      // Force completion to prevent infinite loader
      setEditorBootComplete(true)
    }, 30000)

    return () => clearTimeout(timeout)
  }, [isEditing, isHydrated, editorBootComplete])

  // Session snapshots are diagnostic only. Hero doc-backed images are excluded so
  // un-deployed filter/src edits cannot survive a browser refresh as local state.
  useEffect(() => {
    if (!isEditing || !isHydrated || nodes.size === 0) return
    try {
      const serialized = Array.from(nodes.entries()).filter(([id]) => id !== "hero-bg-image" && id !== "hero-logo")
      window.sessionStorage.setItem("__VISUAL_EDITOR_SESSION_STATE__", JSON.stringify(serialized))
    } catch (e) {
      // Silently fail - sessionStorage might be full or unavailable
    }
  }, [nodes, isEditing, isHydrated])

  const applyNodeToDom = useCallback((node: EditorNode, entry: RuntimeEntry) => {
    const el = entry.element
    const g = node.geometry
    el.style.transition = "none"
    el.style.animation = "none"
    const hasManagedTransform = el.dataset.editorManagedTransform === "true"
    const hasManagedSize = el.dataset.editorManagedSize === "true"
    const isHeroTextPatternNode = HERO_TEXT_PATTERN_NODE_IDS.has(node.id)
    const hasUsableHeroTextGeometry = isHeroTextPatternNode && isUsableHeroTextGeometry(node.geometry)
    const isAboutCopyButtonNode = node.id === "about-copy-button"
    const hasUsableAboutCopyButtonLayout = isAboutCopyButtonNode && hasUsableAboutCopyButtonGeometry(node.geometry)
    const nodeScale = Math.max(0.1, node.style.scale ?? 1)

    // Special handling for hero-scroll-indicator to match public page layout
    if (node.id === "hero-scroll-indicator") {
      if (node.explicitPosition || (node.explicitStyle && nodeScale !== 1)) {
        applyScrollIndicatorLayoutToElement(el, g, nodeScale)
        el.dataset.editorManagedTransform = "true"
      } else {
        if (hasManagedTransform) {
          clearScrollIndicatorLayoutFromElement(el)
          delete el.dataset.editorManagedTransform
        }
      }
    } else if (
      (isHeroTextPatternNode && hasUsableHeroTextGeometry && (node.explicitPosition || (node.explicitStyle && nodeScale !== 1))) ||
      (isAboutCopyButtonNode && hasUsableAboutCopyButtonLayout && (node.explicitPosition || (node.explicitStyle && nodeScale !== 1))) ||
      (!isHeroTextPatternNode && !isAboutCopyButtonNode && (node.explicitPosition || (node.explicitStyle && nodeScale !== 1)))
    ) {
      el.style.transform = nodeScale !== 1
        ? `translate(${g.x}px, ${g.y}px) scale(${nodeScale})`
        : `translate(${g.x}px, ${g.y}px)`
      el.style.transformOrigin = "top left"
      el.dataset.editorManagedTransform = "true"
    } else {
      if (hasManagedTransform) {
        el.style.removeProperty("transform")
        el.style.removeProperty("transform-origin")
        delete el.dataset.editorManagedTransform
      }
    }
    if (
      (isHeroTextPatternNode && hasUsableHeroTextGeometry && node.explicitSize) ||
      (isAboutCopyButtonNode && hasUsableAboutCopyButtonLayout && node.explicitSize) ||
      (!isHeroTextPatternNode && !isAboutCopyButtonNode && node.explicitSize)
    ) {
      el.style.width = `${Math.max(8, g.width)}px`
      el.style.height = `${Math.max(8, g.height)}px`
      el.dataset.editorManagedSize = "true"
    } else {
      if (hasManagedSize) {
        el.style.removeProperty("width")
        el.style.removeProperty("height")
        delete el.dataset.editorManagedSize
      }
    }

    // Only apply opacity to elements that handle it via backgroundColor (buttons, cards via buildBoxOpacityPatch)
    // Don't apply opacity to section/card elements directly as it affects children
    if (node.explicitStyle && node.style.opacity !== undefined && (node.type === "text" || node.type === "image")) {
      el.style.opacity = String(node.style.opacity)
    }
    if (node.type === "text" || node.type === "button") {
      if (node.explicitContent) {
        // Only apply simple text content, NOT innerHTML reconstruction for hero-title
        if (node.content.text !== undefined) {
          el.textContent = node.content.text
        }
      }
      if (node.explicitStyle) {
        // Apply gradient first if enabled, BEFORE applying color
        const nodeStyleAny = node.style as any
        if ((node.type === "text" || node.type === "button") && nodeStyleAny.gradientEnabled) {
          el.style.background = `linear-gradient(90deg, ${nodeStyleAny.gradientStart || "#FFB15A"}, ${nodeStyleAny.gradientEnd || "#FF6C00"})`
          el.style.backgroundClip = "text"
          el.style.webkitBackgroundClip = "text"
          el.style.webkitTextFillColor = "transparent"
          el.style.color = "transparent"
        } else {
          el.style.removeProperty("background")
          el.style.removeProperty("background-image")
          el.style.removeProperty("background-clip")
          el.style.removeProperty("-webkit-background-clip")
          el.style.removeProperty("-webkit-text-fill-color")
          if (node.style.color) el.style.color = node.style.color
        }
        if (node.style.fontSize) el.style.fontSize = node.style.fontSize
        if (node.style.fontFamily) el.style.fontFamily = node.style.fontFamily
        if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight
        if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle
        if (node.style.textDecoration) el.style.textDecoration = node.style.textDecoration
        if (node.style.textAlign) {
          el.style.textAlign = node.style.textAlign
          if (node.type === "button") {
            el.style.justifyContent = node.style.textAlign === "left" ? "flex-start" : node.style.textAlign === "right" ? "flex-end" : "center"
          }
        }
        if (node.style.textShadowEnabled === true) {
          el.style.textShadow = TEXT_EMPHASIS_SHADOW
        } else if (node.style.textShadowEnabled === false) {
          el.style.removeProperty("text-shadow")
        }
      }
    }
    if (node.type === "button") {
      if (node.explicitContent && node.content.href !== undefined && (el.tagName === "A" || el.tagName === "BUTTON")) {
        el.setAttribute("href", node.content.href)
      }
      if (node.explicitContent && node.content.fileName !== undefined && el.tagName === "A") {
        el.setAttribute("download", node.content.fileName)
        el.dataset.editorDownloadName = node.content.fileName
        if (node.content.href) el.dataset.editorDownloadUrl = node.content.href
      }
      if (node.explicitStyle && node.style.backgroundColor) {
        el.style.backgroundColor = node.style.backgroundColor
        if (!node.style.gradientEnabled) el.style.backgroundImage = "none"
      }
    }
    if (node.type === "card" || node.type === "overlay") {
      if (node.explicitContent && node.id === "live-section-concerts-container" && Array.isArray(node.content.concerts)) {
        el.dataset.liveConcerts = JSON.stringify(node.content.concerts)
        emitLiveConcertsUpdated(node.content.concerts)
      } else if (node.explicitContent && /^live-(?:upcoming|history)-event-\d+$/.test(node.id) && Array.isArray(node.content.concerts)) {
        const concert = node.content.concerts[0]
        if (concert) {
          const setField = (field: ConcertField, value: string) => {
            const fieldEl = el.querySelector<HTMLElement>(`[data-concert-field="${field}"]`)
            if (fieldEl) fieldEl.textContent = value
          }
          setField("date", concert.date)
          setField("time", concert.time)
          setField("locationName", concert.locationName)
          setField("locationLink", concert.locationLink)
          setField("style", concert.style)
          setField("price", concert.price)
        }
      } else if (node.explicitContent && /^press-kit-resource-\d+$/.test(node.id)) {
        const titleEl = el.querySelector<HTMLElement>("[data-editor-resource-title]")
        const descriptionEl = el.querySelector<HTMLElement>("[data-editor-resource-description]")
        if (titleEl && node.content.title !== undefined) titleEl.textContent = node.content.title
        if (descriptionEl && node.content.description !== undefined) descriptionEl.textContent = node.content.description
        if (Array.isArray(node.content.assets)) {
          el.dataset.editorResourceAssets = JSON.stringify(node.content.assets)
        }
      } else if (node.explicitContent && node.id === "press-kit-manager") {
        const titleEl = el.querySelector<HTMLElement>("[data-editor-manager-title]")
        const nameEl = el.querySelector<HTMLElement>("[data-editor-manager-name]")
        if (titleEl && node.content.title !== undefined) titleEl.textContent = node.content.title
        if (nameEl && node.content.text !== undefined) nameEl.textContent = node.content.text
        if (node.content.role !== undefined) el.dataset.editorManagerRole = node.content.role
        if (node.content.email !== undefined) el.dataset.editorManagerEmail = node.content.email
        if (node.content.src !== undefined) el.dataset.editorManagerPhoto = node.content.src
      } else if (node.explicitContent && node.content.text !== undefined) {
        el.textContent = node.content.text
      }
      if (node.explicitStyle && node.style.backgroundColor) el.style.backgroundColor = node.style.backgroundColor
    }
    if (node.type === "image" || node.type === "background") {
      const img = el.tagName === "IMG" ? (el as HTMLImageElement) : el.querySelector("img")
      const iframe = node.type === "background" ? el.querySelector("iframe") : null
      if (node.explicitContent) {
        if (node.type === "background" && node.content.mediaKind === "video") {
          const primaryVideoUrl = node.content.videoSources?.find((source) => source.enabled)?.url || node.content.videoUrl
          const embedSrc = getEditorYouTubeEmbedSrc(primaryVideoUrl)
          if (iframe && embedSrc) iframe.setAttribute("src", embedSrc)
          if (!iframe && img) {
            const previewSrc = getEditorYouTubePreviewSrc(primaryVideoUrl || node.content.src)
            if (previewSrc) img.src = previewSrc
          }
        } else {
          if (img && node.content.src) img.src = node.content.src
          if (img && node.content.alt !== undefined) img.alt = node.content.alt
          if (!img && node.content.src) el.style.backgroundImage = `url(${node.content.src})`
        }
      }
      if (node.explicitStyle && (node.type !== "background" || node.content.mediaKind !== "video")) {
        const contrast = node.style.contrast ?? 100
        const saturation = node.style.saturation ?? 100
        const brightness = node.style.brightness ?? 100
        const negative = node.style.negative ?? false
        const filterValue = `contrast(${contrast}%) saturate(${saturation}%) brightness(${brightness}%)${negative ? " invert(1)" : ""}`
        if (img) {
          img.style.filter = filterValue
        } else {
          el.style.filter = filterValue
        }
      }
    }
    if (node.type === "section") {
      if (node.explicitStyle) {
        if (node.style.backgroundColor) el.style.backgroundColor = node.style.backgroundColor
        if (node.style.minHeight) el.style.minHeight = node.style.minHeight
        if (node.style.paddingTop) el.style.paddingTop = node.style.paddingTop
        if (node.style.paddingBottom) el.style.paddingBottom = node.style.paddingBottom
      }
    }
  }, [])

  useEffect(() => {
    if (!isEditing || !isHydrated) return
    // Skip if already built - only apply geometry/style after initial build
    if (!nodesBuiltRef.current) return
    nodes.forEach((node, id) => {
      const entry = registry.get(id)
      if (!entry) return
      applyNodeToDom(node, entry)
    })
  }, [nodes, registry, isEditing, isHydrated, applyNodeToDom])

  const dispatch = useCallback((command: Command) => {
    setNodes((prev) => {
      const next = new Map(prev)
      const patchNode = (nodeId: string, updater: (node: EditorNode) => EditorNode) => {
        let node = next.get(nodeId)
        if (!node && isPersistOnlyNodeId(nodeId)) {
          const hydrated = readHydratedNodeOverride(nodeId)
          const created = createPersistOnlyNode(nodeId, hydrated)
          next.set(nodeId, created)
          node = created
        }
        if (!node) return
        const updated = updater(node)
        if (updated === node) return
        next.set(nodeId, updated)
      }

      let shouldSnapshot = true
      switch (command.type) {
        case "SELECT_NODE":
          setSelectedId(command.nodeId)
          setOpenPanel(true)
          shouldSnapshot = false
          return next
        case "DESELECT_NODE":
          setSelectedId(null)
          setOpenPanel(false)
          shouldSnapshot = false
          return next
        case "BEGIN_TRANSACTION":
          transactionRef.current = { active: true, baseline: new Map(prev) }
          shouldSnapshot = false
          return next
        case "END_TRANSACTION": {
          const tx = transactionRef.current
          transactionRef.current = { active: false, baseline: null }
          shouldSnapshot = false
          if (!tx.active || !tx.baseline) return next
          const before = JSON.stringify(Array.from(tx.baseline.entries()))
          const after = JSON.stringify(Array.from(next.entries()))
          if (before !== after) snapshot(next)
          return next
        }
        case "MOVE_NODE":
          patchNode(command.nodeId, (n) => ({ ...n, explicitPosition: true, geometry: { ...n.geometry, x: n.geometry.x + command.dx, y: n.geometry.y + command.dy } }))
          shouldSnapshot = false
          break
        case "RESIZE_NODE":
          patchNode(command.nodeId, (n) => ({ ...n, explicitSize: true, geometry: { ...n.geometry, width: command.width, height: command.height } }))
          shouldSnapshot = false
          break
        case "SET_NODE_GEOMETRY":
          patchNode(command.nodeId, (n) => ({
            ...n,
            explicitPosition: true,
            explicitSize: command.explicitSize ?? true,
            geometry: { ...n.geometry, x: command.x, y: command.y, width: command.width, height: command.height },
          }))
          shouldSnapshot = false
          break
        case "SET_NODE_SCALE":
          patchNode(command.nodeId, (n) => ({
            ...n,
            explicitStyle: true,
            style: { ...n.style, scale: Math.max(0.1, command.scale) },
          }))
          shouldSnapshot = false
          break
        case "UPDATE_TEXT":
        case "UPDATE_BUTTON":
        case "UPDATE_IMAGE":
        case "UPDATE_CARD":
        case "UPDATE_BACKGROUND":
        case "UPDATE_SECTION":
        case "UPDATE_GROUP": {
          patchNode(command.nodeId, (n) => {
            const content: EditorNode["content"] = { ...n.content }
            const style = { ...n.style }
            let isContentEdit = !!n.explicitContent
            let isStyleEdit = !!n.explicitStyle
            Object.entries(command.patch).forEach(([k, v]) => {
              // Gradient properties are STYLE, not content
              if (["gradientEnabled", "gradientStart", "gradientEnd", "textShadowEnabled", "accentGradientEnabled", "accentGradientStart", "accentGradientEnd"].includes(k)) {
                isStyleEdit = true;
                (style as Record<string, unknown>)[k] = v
              }
              // Content properties
              else if (["text", "title", "description", "textSegments", "titleSegments", "href", "fileName", "download", "assets", "src", "alt", "role", "email", "videoUrl", "videoSources", "backgroundVideoSources", "concerts", "accentText"].includes(k)) {
                isContentEdit = true;
                (content as Record<string, unknown>)[k] = v
              }
              // Other style properties
              else {
                isStyleEdit = true;
                (style as Record<string, unknown>)[k] = v
              }
            })
            const updated = { ...n, content, style, explicitContent: isContentEdit, explicitStyle: isStyleEdit }
            return updated
          })
          break
        }
        case "ADD_EXTRA_NODE": {
          next.set(command.node.id, command.node)
          setSelectedId(command.node.id)
          setOpenPanel(true)
          window.setTimeout(() => setRegistry(scanRegistry()), 0)
          break
        }
        case "DELETE_NODE":
          {
            const entry = registry.get(command.nodeId)
            if (entry?.element) {
              entry.element.dataset.editorDeleted = "true"
              entry.element.style.display = "none"
              deletedIdsRef.current.add(command.nodeId)
            }
          }
          next.delete(command.nodeId)
          if (selectedId === command.nodeId) {
            setSelectedId(null)
            setOpenPanel(false)
          }
          next.delete(command.nodeId)
          setSelectedId((current) => (current === command.nodeId ? null : current))
          setOpenPanel((current) => (current ? false : current))
          break
        case "COPY_NODE": {
          const node = next.get(command.nodeId)
          if (node) clipboardRef.current = structuredClone(node)
          break
        }
        case "CUT_NODE": {
          const node = next.get(command.nodeId)
          if (node) clipboardRef.current = structuredClone(node)
          const entry = registry.get(command.nodeId)
          if (entry?.element) {
            entry.element.dataset.editorDeleted = "true"
            entry.element.style.display = "none"
            deletedIdsRef.current.add(command.nodeId)
          }
          next.delete(command.nodeId)
          if (selectedId === command.nodeId) {
            setSelectedId(null)
            setOpenPanel(false)
          }
          next.delete(command.nodeId)
          setSelectedId((current) => (current === command.nodeId ? null : current))
          setOpenPanel((current) => (current ? false : current))
          break
        }
        case "PASTE_NODE": {
          const clip = clipboardRef.current
          if (!clip) break
          const id = `${clip.id}-copy-${Date.now()}`
          const sourceEntry = registry.get(clip.id)
          if (sourceEntry?.element) {
            const clone = sourceEntry.element.cloneNode(true)
            if (clone instanceof HTMLElement) {
              clone.dataset.editorNodeId = id
              clone.dataset.editorManagedTransform = "true"
              clone.querySelectorAll<HTMLElement>("[data-editor-node-id]").forEach((child) => {
                if (child === clone) return
                delete child.dataset.editorNodeId
                delete child.dataset.editorNodeType
                delete child.dataset.editorNodeLabel
                delete child.dataset.editorGrouped
              })
              sourceEntry.element.insertAdjacentElement("afterend", clone)
            }
          }
          next.set(id, { ...structuredClone(clip), id, geometry: { ...clip.geometry, x: clip.geometry.x + 24, y: clip.geometry.y + 24 }, explicitPosition: true })
          setSelectedId(id)
          setOpenPanel(true)
          break
        }
        default:
          break
      }

      if (shouldSnapshot && !transactionRef.current.active) snapshot(next)
      return next
    })
  }, [registry, selectedId, snapshot])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    const idx = historyIndexRef.current - 1
    historyIndexRef.current = idx
    setHistoryIndex(idx)
    const nextState = historyRef.current[idx]
    if (nextState) setNodes(new Map(nextState))
  }, [])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    const idx = historyIndexRef.current + 1
    historyIndexRef.current = idx
    setHistoryIndex(idx)
    const nextState = historyRef.current[idx]
    if (nextState) setNodes(new Map(nextState))
  }, [])

  const getEditableAtPosition = useCallback((x: number, y: number): RuntimeEntry | null => {
    const els = document.elementsFromPoint(x, y)
    const candidates: RuntimeEntry[] = []
    const addCandidate = (entry: RuntimeEntry | undefined) => {
      if (!entry || !entry.eligible) return
      if (!candidates.find((c) => c.id === entry.id)) candidates.push(entry)
    }

    for (const candidate of els) {
      if (!(candidate instanceof HTMLElement)) continue
      if (candidate.closest("[data-editor-toolbar]") || candidate.closest("[data-editor-panel]")) continue

      // Concert card editing always wins over parent grouped lists and generic card handlers.
      const concertField = candidate.closest<HTMLElement>("[data-concert-field][data-editor-node-id]")
      if (concertField?.dataset.editorNodeId) {
        const concertFieldEntry = registry.get(concertField.dataset.editorNodeId)
        if (concertFieldEntry?.eligible) return concertFieldEntry
      }

      const concertCard = candidate.closest<HTMLElement>("[data-concert-card='true'][data-editor-node-id]")
      if (concertCard?.dataset.editorNodeId) {
        const concertEntry = registry.get(concertCard.dataset.editorNodeId)
        if (concertEntry?.eligible) return concertEntry
      }

      const bound = candidate.closest<HTMLElement>("[data-editor-node-id]")
      if (!bound?.dataset.editorNodeId) continue
      const entry = registry.get(bound.dataset.editorNodeId)
      addCandidate(entry)
    }

    ;["about-copy-button", "about-text-card", "about-section"].forEach((nodeId) => {
      const entry = registry.get(nodeId)
      if (!entry?.eligible) return
      const rect = entry.element.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        addCandidate(entry)
      }
    })

    registry.forEach((entry) => {
      if (!entry.eligible) return
      const rect = entry.element.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        addCandidate(entry)
      }
    })

    const aboutCopyButtonEntry = candidates.find((c) => c.id === "about-copy-button")
    if (aboutCopyButtonEntry) {
      return aboutCopyButtonEntry
    }

    if (candidates.length === 0) return null

    const navigationEntry = candidates.find((c) => c.id === "navigation")
    if (navigationEntry) {
      const navRect = navigationEntry.element.getBoundingClientRect()
      const insideNavigation = x >= navRect.left && x <= navRect.right && y >= navRect.top && y <= navRect.bottom
      if (insideNavigation) {
        const navigationInnerEntry = candidates.find((c) => c.id === "navigation-inner")
        const navSpecificChild = candidates.find((c) => c.id !== "navigation" && c.id.startsWith("nav-") && c.type !== "section")
        if (navSpecificChild) return navSpecificChild
        if (navigationInnerEntry) return navigationInnerEntry
        return navigationEntry
      }
    }

    const heroTitleEntry = candidates.find((c) => c.id === "hero-title")
    if (heroTitleEntry) {
      const heroTitleRect = heroTitleEntry.element.getBoundingClientRect()
      const insideHeroTitle = x >= heroTitleRect.left && x <= heroTitleRect.right && y >= heroTitleRect.top && y <= heroTitleRect.bottom
      if (insideHeroTitle) {
        return heroTitleEntry
      }
    }

    candidates.sort((a, b) => typePriority[a.type] - typePriority[b.type])

    const best = candidates[0]
    if (best && HERO_TEXT_PATTERN_NODE_IDS.has(best.id)) return best
    if (best && BAND_MEMBER_PERSIST_ONLY_NODE_ID.test(best.id)) return best
    if (best) {
      const groupedAncestor = best.element.parentElement?.closest<HTMLElement>("[data-editor-grouped='true'][data-editor-node-id]")
      if (groupedAncestor?.dataset.editorNodeId && groupedAncestor.dataset.editorNodeId !== best.id) {
        const groupedEntry = registry.get(groupedAncestor.dataset.editorNodeId)
        if (groupedEntry) return groupedEntry
      }
    }
    if (best.type !== "section") return best

    const child = candidates.find((c) => c.type !== "section")
    if (child) return child

    return best
  }, [registry])

  useEffect(() => {
    if (!isEditing) return
    const scheduleRegistryRefresh = () => {
      if (registryRafRef.current !== null) window.cancelAnimationFrame(registryRafRef.current)
      registryRafRef.current = window.requestAnimationFrame(() => {
        setRegistry(scanRegistry())
        registryRafRef.current = null
      })
    }
    const observer = new ResizeObserver(scheduleRegistryRefresh)
    registry.forEach((entry) => observer.observe(entry.element))
    window.addEventListener("scroll", scheduleRegistryRefresh, true)
    window.addEventListener("resize", scheduleRegistryRefresh)
    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", scheduleRegistryRefresh, true)
      window.removeEventListener("resize", scheduleRegistryRefresh)
      if (registryRafRef.current !== null) {
        window.cancelAnimationFrame(registryRafRef.current)
        registryRafRef.current = null
      }
    }
  }, [isEditing, registry])

  // Also protect registry-based node building from re-running
  useEffect(() => {
    if (!isEditing) return
    // Skip if already built with nodesBuiltRef
    if (nodesBuiltRef.current) return

    setNodes((prev) => {
      const next = new Map(prev)
      let changed = false

      registry.forEach((entry, id) => {
        if (next.has(id)) return
        next.set(id, buildNodeFromEntry(entry))
        changed = true
      })

      for (const id of next.keys()) {
        if (registry.has(id)) continue
        if (isPersistOnlyNodeId(id)) continue
        if (isExtraNodeId(id)) continue
        next.delete(id)
        changed = true
      }

      return changed ? next : prev
    })
  }, [isEditing, registry])

  const value: VisualEditorContextType = {
    isEditing,
    isMobileEditBlocked,
    editorBootComplete,
    setIsEditing,
    selectedId,
    setSelectedId,
    openPanel,
    setOpenPanel,
    nodes,
    editableElements: new Map(Array.from(nodes.entries()).map(([id, n]) => {
      const entry = registry.get(id)
      const legacy: LegacyEditable = {
        id,
        type: n.type,
        label: n.label,
        parentId: null,
        element: entry?.element || null,
        originalRect: entry?.rect || null,
        transform: { x: n.geometry.x, y: n.geometry.y },
        dimensions: { width: n.geometry.width, height: n.geometry.height },
      }
      return [id, legacy]
    })),
    registry,
    dispatch,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    assets,
    registerEditable: () => {},
    unregisterEditable: () => {},
    getElementById: (id: string) => {
      const node = nodes.get(id)
      const entry = registry.get(id)
      if (!node) return undefined
      return {
        id,
        type: node.type,
        label: node.label,
        parentId: null,
        element: entry?.element || null,
        originalRect: entry?.rect || null,
        transform: { x: node.geometry.x, y: node.geometry.y },
        dimensions: { width: node.geometry.width, height: node.geometry.height },
      }
    },
    getEditableAtPosition,
  }

  return (
    <VisualEditorContext.Provider value={value}>
      <MotionConfig reducedMotion={isEditing ? "always" : "never"}>
        {children}
        {isEditing && <ExtraNodesLayer nodes={nodes} />}
      </MotionConfig>
    </VisualEditorContext.Provider>
  )
}

function SelectionOverlay({ entry }: { entry: RuntimeEntry }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const overlayTheme = getSelectionOverlayTheme(entry)
  const edgeHandles = (["n", "e", "s", "w"] as const).map((handle) => {
    const className =
      handle === "n" ? "left-7 right-7 top-[-8px] h-4 cursor-ns-resize" :
      handle === "s" ? "bottom-[-8px] left-7 right-7 h-4 cursor-ns-resize" :
      handle === "e" ? "bottom-7 right-[-8px] top-7 w-4 cursor-ew-resize" :
      "bottom-7 left-[-8px] top-7 w-4 cursor-ew-resize"
    return { handle, className }
  })

  useEffect(() => {
    let rafId: number | null = null
    const applyRect = () => {
      const rect = entry.element.getBoundingClientRect()
      if (!boxRef.current) return
      boxRef.current.style.left = `${rect.left}px`
      boxRef.current.style.top = `${rect.top}px`
      boxRef.current.style.width = `${rect.width}px`
      boxRef.current.style.height = `${rect.height}px`
    }
    const tick = () => {
      applyRect()
      rafId = window.requestAnimationFrame(tick)
    }
    tick()
    const syncOnce = () => applyRect()
    const observer = new ResizeObserver(syncOnce)
    observer.observe(entry.element)
    window.addEventListener("resize", syncOnce)
    window.addEventListener("scroll", syncOnce, true)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncOnce)
      window.removeEventListener("scroll", syncOnce, true)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [entry])

  return createPortal(
    <div data-editor-overlay className="fixed inset-0 pointer-events-none z-[9990]">
      <div
        ref={boxRef}
        className={`absolute border-2 ${overlayTheme.borderClass}`}
      >
        {edgeHandles.map(({ handle, className }) => (
          <div
            key={`edge-${handle}`}
            data-editor-resize-handle={handle}
            data-editor-resize-node-id={entry.id}
            className={`absolute ${className}`}
            style={{ pointerEvents: "auto" }}
          />
        ))}
        {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => {
          const isCorner = handle.length === 2
          const sizeClass = isCorner ? "h-7 w-7 z-30" : "h-3 w-3 z-10"
          return (
            <div
              key={handle}
              data-editor-resize-handle={handle}
              data-editor-resize-node-id={entry.id}
              className={`absolute rounded-sm border border-white ${sizeClass} ${overlayTheme.handleClass} shadow ${
                handle === "nw" ? "-left-3 -top-3 cursor-nwse-resize" :
                handle === "n" ? "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize" :
                handle === "ne" ? "-right-3 -top-3 cursor-nesw-resize" :
                handle === "e" ? "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" :
                handle === "se" ? "-bottom-3 -right-3 cursor-nwse-resize" :
                handle === "s" ? "bottom-[-0.5rem] left-1/2 -translate-x-1/2 cursor-ns-resize" :
                handle === "sw" ? "-bottom-3 -left-3 cursor-nesw-resize" :
                "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize"
              }`}
              style={{ pointerEvents: "auto" }}
            />
          )
        })}
      </div>
    </div>,
    document.body
  )
}

function ExtraNodesLayer({ nodes }: { nodes: Map<string, EditorNode> }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      {Array.from(nodes.values()).map((node) => {
        const kind = getExtraNodeKind(node)
        if (!kind) return null
        const parent = document.querySelector<HTMLElement>(`[data-editor-node-id="${node.sectionId}"]`)
        if (!parent) return null

        const baseStyle: CSSProperties = {
          position: "absolute",
          left: 0,
          top: 0,
          width: `${Math.max(8, node.geometry.width)}px`,
          height: `${Math.max(8, node.geometry.height)}px`,
          transform: `translate(${node.geometry.x}px, ${node.geometry.y}px)`,
          transformOrigin: "top left",
          zIndex: kind === "overlay" ? 8 : 20,
          color: node.style.color,
          backgroundColor: node.style.backgroundColor,
          fontSize: node.style.fontSize,
          fontFamily: node.style.fontFamily,
          fontWeight: node.style.fontWeight,
          fontStyle: node.style.fontStyle,
          textDecoration: node.style.textDecoration,
          textAlign: node.style.textAlign,
          display: kind === "button" ? "inline-flex" : kind === "text" ? "block" : "flex",
          alignItems: kind === "text" ? undefined : "center",
          justifyContent: kind === "text" ? undefined : node.style.textAlign === "left" ? "flex-start" : node.style.textAlign === "right" ? "flex-end" : "center",
          padding: kind === "text" ? undefined : kind === "button" ? "0 18px" : "16px",
          borderRadius: kind === "text" ? undefined : kind === "button" ? "8px" : "8px",
          border: kind === "card" ? "1px solid rgba(255,255,255,0.18)" : undefined,
          backdropFilter: kind === "overlay" ? "blur(2px)" : undefined,
          pointerEvents: "auto",
        }
        if (kind === "text" || kind === "button") {
          baseStyle.textShadow = node.style.textShadowEnabled ? TEXT_EMPHASIS_SHADOW : "none"
        }
        if ((kind === "text" || kind === "button") && node.style.gradientEnabled) {
          baseStyle.background = `linear-gradient(90deg, ${node.style.gradientStart || "#FFB15A"}, ${node.style.gradientEnd || "#FF6C00"})`
          baseStyle.backgroundClip = "text"
          baseStyle.WebkitBackgroundClip = "text"
          baseStyle.WebkitTextFillColor = "transparent"
          baseStyle.color = "transparent"
        }

        const commonProps = {
          "data-editor-node-id": node.id,
          "data-editor-node-type": node.type,
          "data-editor-node-label": node.label,
          "data-editor-section-id": node.sectionId,
          "data-editor-extra-node": "true",
          style: baseStyle,
        }

        if (kind === "button") {
          return createPortal(
            <a {...commonProps} href={node.content.href || "#"}>{node.content.text || "New button"}</a>,
            parent
          )
        }

        return createPortal(
          <div {...commonProps}>{kind === "overlay" ? "" : node.content.text}</div>,
          parent
        )
      })}
    </>
  )
}

export function VisualEditorOverlay() {
  const t = new Date().toISOString()
  console.log(`[OVERLAY-MOUNT] ${t} - VisualEditorOverlay mounting`)
  const { isEditing, isMobileEditBlocked, setIsEditing, selectedId, nodes, registry, dispatch, openPanel, setOpenPanel, undo, redo, canUndo, canRedo, assets, getEditableAtPosition } = useVisualEditor()
  console.log(`[OVERLAY-MOUNT] ${t} - Context loaded. isEditing=${isEditing}, nodes.size=${nodes.size}`)
  const [deployStatus, setDeployStatus] = useState<string | null>(null)
  const [deployDetails, setDeployDetails] = useState<string | null>(null)
  const [deployDetailsExpanded, setDeployDetailsExpanded] = useState(false)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")
  const [hasNonPersistableUpload, setHasNonPersistableUpload] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [addMessage, setAddMessage] = useState<string | null>(null)
  const selectedIdsRef = useRef<string[]>(selectedIds)
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const marqueeRef = useRef<{ active: boolean; start: Point }>({ active: false, start: { x: 0, y: 0 } })
  const nodesRef = useRef<Map<string, EditorNode>>(nodes)
  const baselineNodeSignaturesRef = useRef<Map<string, string>>(new Map())
  const dirtyNodeIdsRef = useRef<Set<string>>(new Set())
  const extraNodeCounterRef = useRef(0)

  const getNodeSignature = useCallback((node: EditorNode): string => {
    return JSON.stringify({
      geometry: node.geometry,
      style: node.style,
      content: node.content,
      explicitContent: node.explicitContent,
      explicitStyle: node.explicitStyle,
      explicitPosition: node.explicitPosition,
      explicitSize: node.explicitSize,
    })
  }, [])

  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  useEffect(() => {
    if (!selectedId) setSelectedIds([])
  }, [selectedId])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    if (!isEditing) {
      baselineNodeSignaturesRef.current = new Map()
      dirtyNodeIdsRef.current = new Set()
      return
    }
    if (baselineNodeSignaturesRef.current.size === 0) {
      const baseline = new Map<string, string>()
      nodes.forEach((node, id) => baseline.set(id, getNodeSignature(node)))
      baselineNodeSignaturesRef.current = baseline
      return
    }
    nodes.forEach((node, id) => {
      const baseline = baselineNodeSignaturesRef.current.get(id)
      const current = getNodeSignature(node)
      if (baseline === undefined || baseline !== current) {
        dirtyNodeIdsRef.current.add(id)
      }
    })
  }, [isEditing, nodes, getNodeSignature])

  const selectedEntry = selectedId ? registry.get(selectedId) || null : null
  const selectedNode = selectedId ? nodes.get(selectedId) || null : null
  // Hero title treated as simple text - disable segment UI to prevent innerHTML reconstruction
  // This fixes the rollback issue by removing segment-based DOM reconstruction
  const heroTitleSegments: TextSegment[] = selectedNode?.id === "hero-title" ? [] : (selectedNode?.content.titleSegments || selectedNode?.content.textSegments || [])
  const heroSubtitleSegments: TextSegment[] = selectedNode?.id === "hero-subtitle" ? [] : (selectedNode?.content.titleSegments || selectedNode?.content.textSegments || [])
  const canUseSimpleTextTools = hasRealTextToolingWriter(selectedNode)
  const isHeroAssetNode =
    (selectedNode?.type === "image" || selectedNode?.type === "background") &&
    (selectedNode.id === "hero-logo" || selectedNode.id === "hero-bg-image")
  const isFooterSocialGroup = selectedNode?.type === "card" && selectedNode.id === "footer-social-group"
  const hasNestedEditableChildren = Boolean(
    selectedNode?.type === "card" &&
      selectedEntry?.element &&
      Array.from(selectedEntry.element.querySelectorAll<HTMLElement>("[data-editor-node-id]")).some(
        (el) => (el.dataset.editorNodeId || "") !== selectedNode.id
      )
  )
  const hasStructuredCardFields = Boolean(
    selectedNode?.type === "card" &&
      selectedEntry?.element &&
      (
        selectedEntry.element.dataset.concertCard === "true" ||
        selectedEntry.element.dataset.linkGroupSummary ||
        selectedEntry.element.querySelector("[data-concert-field]")
      )
  )
  const isSimpleEditableBox =
    (selectedNode?.type === "card" || selectedNode?.type === "overlay") &&
    !isFooterSocialGroup &&
    (selectedNode.id === "latest-release-card" ||
      selectedNode.id === "about-text-card" ||
      /^member-item-\d+$/.test(selectedNode.id) ||
      !hasNestedEditableChildren) &&
    !hasStructuredCardFields

  const selectedEntryElement = selectedEntry?.element
  const footerSocialLinkItems = (() => {
    if (!isFooterSocialGroup || !selectedEntryElement) return [] as Array<{ id: string; name: string; href: string }>
    return Array.from(selectedEntryElement.querySelectorAll<HTMLElement>("[data-link-item='true'][data-editor-node-id]"))
      .map((el) => {
        const id = (el.dataset.editorNodeId || "").trim()
        if (!id) return null
        const node = nodes.get(id)
        return {
          id,
          name: (el.dataset.linkItemName || el.dataset.editorNodeLabel || id).trim(),
          href: (node?.content.href || el.getAttribute("href") || "").trim(),
        }
      })
      .filter((item): item is { id: string; name: string; href: string } => Boolean(item))
  })()

  const addExtraNode = (kind: ExtraNodeKind): void => {
    const selectedSectionElement =
      selectedEntry?.element?.closest<HTMLElement>("[data-editor-node-type='section'][data-editor-node-id]") ||
      (selectedEntry?.type === "section" ? selectedEntry.element : null)
    const viewportCenterY = window.innerHeight / 2
    const fallbackSection = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-node-type='section'][data-editor-node-id]"))
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > 0 && rect.top < window.innerHeight)
      .sort((a, b) => Math.abs((a.rect.top + a.rect.bottom) / 2 - viewportCenterY) - Math.abs((b.rect.top + b.rect.bottom) / 2 - viewportCenterY))[0]?.el || null
    const sectionElement = selectedSectionElement || fallbackSection
    const sectionId = sectionElement?.dataset.editorNodeId || null

    if (!sectionElement || !sectionId) {
      setAddMessage("Select a section before adding a block.")
      return
    }

    const existingCount = Array.from(nodes.values()).filter((node) => node.sectionId === sectionId && getExtraNodeKind(node) === kind).length
    const limit = EXTRA_NODE_LIMITS[kind]
    if (existingCount >= limit) {
      setAddMessage(`Too many extra ${kind}s in this section. Remove one element before adding another.`)
      return
    }

    const rect = sectionElement.getBoundingClientRect()
    const defaults: Record<ExtraNodeKind, { type: NodeType; label: string; width: number; height: number; text?: string; href?: string; style: EditorNode["style"] }> = {
      text: {
        type: "text",
        label: "Extra Text",
        width: 260,
        height: 48,
        text: "New text",
        style: { color: "#ffffff", fontSize: "24px", fontWeight: "600", textShadowEnabled: false },
      },
      button: {
        type: "button",
        label: "Extra Button",
        width: 164,
        height: 48,
        text: "New button",
        href: "#",
        style: { color: "#ffffff", backgroundColor: "rgba(255, 140, 33, 0.85)", fontSize: "16px", fontWeight: "600" },
      },
      card: {
        type: "card",
        label: "Extra Card",
        width: 300,
        height: 168,
        style: { backgroundColor: "rgba(0, 0, 0, 0.45)" },
      },
      overlay: {
        type: "overlay",
        label: "Extra Overlay",
        width: 340,
        height: 190,
        style: { backgroundColor: "rgba(0, 0, 0, 0.32)" },
      },
    }
    const preset = defaults[kind]
    const yBase = Math.max(32, Math.min(Math.max(32, rect.height - preset.height - 32), window.innerHeight * 0.35 - rect.top))
    const xBase = Math.max(32, Math.min(Math.max(32, rect.width - preset.width - 32), 80 + existingCount * 18))
    extraNodeCounterRef.current += 1
    let nodeId = `${EXTRA_NODE_PREFIX}${sectionId}-${kind}-${extraNodeCounterRef.current}`
    while (nodes.has(nodeId)) {
      extraNodeCounterRef.current += 1
      nodeId = `${EXTRA_NODE_PREFIX}${sectionId}-${kind}-${extraNodeCounterRef.current}`
    }
    const node: EditorNode = {
      id: nodeId,
      type: preset.type,
      sectionId,
      label: preset.label,
      isGrouped: false,
      geometry: {
        x: Math.round(xBase),
        y: Math.round(yBase + existingCount * 18),
        width: preset.width,
        height: preset.height,
      },
      style: preset.style,
      content: {
        text: preset.text,
        href: preset.href,
        extraNodeType: kind,
        parentSection: sectionId,
        label: preset.label,
      },
      explicitContent: true,
      explicitStyle: true,
      explicitPosition: true,
      explicitSize: true,
    }

    dispatch({ type: "ADD_EXTRA_NODE", node })
    setSelectedIds([nodeId])
    setAddMenuOpen(false)
    setAddMessage(null)
  }

  const selectedBandMemberIndex = extractBandMemberIndex(selectedNode?.id)
  const selectedLiveConcertCardMatch = selectedNode?.id.match(/^live-(upcoming|history)-event-(\d+)$/)
  const selectedLiveConcertCard = selectedLiveConcertCardMatch && Array.isArray(selectedNode?.content.concerts)
    ? selectedNode.content.concerts[0] || null
    : null

  const updateLiveConcertsContainer = useCallback((concerts: LiveConcertEditorItem[]) => {
    dispatch({ type: "UPDATE_CARD", nodeId: "live-section-concerts-container", patch: { concerts } })
    emitLiveConcertsUpdated(concerts)
  }, [dispatch])

  const updateSelectedLiveConcertCard = useCallback((patch: Partial<LiveConcertEditorItem>) => {
    if (!selectedNode || !selectedLiveConcertCard) return
    const nextConcert = { ...selectedLiveConcertCard, ...patch }
    dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { concerts: [nextConcert] } })
    const container = nodes.get("live-section-concerts-container")
    if (Array.isArray(container?.content.concerts)) {
      const nextConcerts = container.content.concerts.map((concert) => concert._editorId === nextConcert._editorId ? nextConcert : concert)
      updateLiveConcertsContainer(nextConcerts)
    }
  }, [nodes, selectedLiveConcertCard, selectedNode, updateLiveConcertsContainer])

  const getBandMemberFieldValue = useCallback((index: number, field: "number" | "name" | "role" | "photo"): string => {
    if (typeof document === "undefined") return ""
    if (field === "number") return document.querySelector<HTMLElement>(`[data-member-number-index="${index}"]`)?.textContent?.trim() || ""
    if (field === "name") return document.querySelector<HTMLElement>(`[data-member-name-index="${index}"]`)?.textContent?.trim() || ""
    if (field === "role") return document.querySelector<HTMLElement>(`[data-member-role-index="${index}"]`)?.textContent?.trim() || ""
    return document.querySelector<HTMLImageElement>(`[data-member-photo-index="${index}"]`)?.src || ""
  }, [])

  const updateBandMemberField = useCallback((index: number, field: "number" | "name" | "role" | "photo", value: string) => {
    if (typeof document === "undefined") return
    if (field === "number") {
      const el = document.querySelector<HTMLElement>(`[data-member-number-index="${index}"]`)
      if (el) el.textContent = value
      dispatch({ type: "UPDATE_TEXT", nodeId: `member-item-${index}-number`, patch: { text: value } })
      return
    }
    if (field === "name") {
      document.querySelectorAll<HTMLElement>(`[data-member-name-index="${index}"],[data-member-overlay-name-index="${index}"]`).forEach((el) => {
        el.textContent = value
      })
      dispatch({ type: "UPDATE_TEXT", nodeId: `member-item-${index}-name`, patch: { text: value } })
      return
    }
    if (field === "role") {
      document.querySelectorAll<HTMLElement>(`[data-member-role-index="${index}"],[data-member-overlay-role-index="${index}"]`).forEach((el) => {
        el.textContent = value
      })
      dispatch({ type: "UPDATE_TEXT", nodeId: `member-item-${index}-role`, patch: { text: value } })
      return
    }
    document.querySelectorAll<HTMLImageElement>(`[data-member-photo-index="${index}"]`).forEach((img) => {
      img.src = value
    })
    dispatch({ type: "UPDATE_IMAGE", nodeId: `member-item-${index}-image`, patch: { src: value, mediaKind: "image" } })
  }, [dispatch])
  const exitEditor = () => {
    // Clear session state when exiting editor
    try {
      window.sessionStorage.removeItem("__VISUAL_EDITOR_SESSION_STATE__")
    } catch (e) {
      // Silently fail
    }
    setIsEditing(false)
    window.location.reload()
  }

  const onDeploy = async () => {
    setDeployStatus("connecting")
    setDeployDetailsExpanded(false)
    setCopyState("idle")
    try {
      const changedNodeIds = Array.from(dirtyNodeIdsRef.current)
      console.log("[DEPLOY][dirty-nodes]", {
        totalDirty: changedNodeIds.length,
        nodeIds: changedNodeIds,
        dirtySet: Array.from(dirtyNodeIdsRef.current)
      })
      const deployableNodes = Array.from(nodes.values())
      const nonPersistableNodes = deployableNodes
        .filter((node) => (node.type === "image" || node.type === "background") && !isPersistableImageSrc(node.content.src))
        .map((node) => node.id)
      const serializedNodes = deployableNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        isGrouped: node.isGrouped,
        geometry: node.geometry,
        style: node.style,
        content: node.content,
        explicitContent: node.explicitContent,
        explicitStyle: node.explicitStyle,
        explicitPosition: node.explicitPosition,
        explicitSize: node.explicitSize,
      }))
      const payload = {
        level: "green" as const,
        findings: [],
        nodes: serializedNodes,
        allNodes: serializedNodes,
        changedNodeIds,
      }
      const response = await fetch("/api/editor-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as {
        status?: "ok" | "partial" | "failed"
        step?: "checking" | "saving" | "publishing" | "revalidating" | "done" | "failed"
        message?: string
        routeVersion?: string
        envDiagnostics?: {
          SANITY_PROJECT_ID: "yes" | "no"
          NEXT_PUBLIC_SANITY_PROJECT_ID: "yes" | "no"
          SANITY_DATASET: "yes" | "no"
          SANITY_API_WRITE_TOKEN: "yes" | "no"
          SANITY_API_TOKEN: "yes" | "no"
        }
        diagnostics?: {
          SANITY_PROJECT_ID: "yes" | "no"
          NEXT_PUBLIC_SANITY_PROJECT_ID: "yes" | "no"
          SANITY_DATASET: "yes" | "no"
          SANITY_API_WRITE_TOKEN: "yes" | "no"
          SANITY_API_TOKEN: "yes" | "no"
        }
        steps?: Array<{ step: string; ok: boolean; message: string }>
        changedNodeIds?: string[]
        changedNodesPersisted?: string[]
        changedNodesSkipped?: string[]
        changedNodesFailed?: string[]
        verificationByNodeId?: Record<string, {
          storageTarget: string
          expected: Record<string, unknown>
          readBack: Record<string, unknown> | null
          matched: boolean
          mismatchReason: string | null
        }>
        persistedNodes?: string[]
        skippedNodes?: string[]
        failedNodes?: string[]
      }
      const envDiagnostics = data.envDiagnostics || data.diagnostics

      console.info("[editor-deploy] raw response", {
        endpoint: "/api/editor-deploy",
        statusCode: response.status,
        ok: response.ok,
        body: data,
      })

      const lines: string[] = ["connecting"]
      lines.push(`changedNodeIds: ${JSON.stringify(changedNodeIds)}`)
      if (nonPersistableNodes.length > 0) {
        lines.push(`nonPersistableImageSrcNodes: ${nonPersistableNodes.join(", ")}`)
      }
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        data.steps.forEach((item) => {
          lines.push(item.step)
        })
      }
      if (data.step) {
        lines.push(data.step)
      }

      if (!response.ok) {
        setDeployStatus("failed")
        lines.push("failed")
        lines.push(`routeVersion: ${data.routeVersion || "missing"}`)
        lines.push(`step: ${data.step || "missing"}`)
        lines.push(`message: ${data.message || "missing"}`)
        lines.push(`envDiagnostics: ${JSON.stringify(envDiagnostics || null)}`)
        lines.push(`rawResponse: ${JSON.stringify(data)}`)
        setDeployDetails(lines.join("\n"))
        return
      }

      const hasChangedNodeFailures = Array.isArray(data.changedNodesFailed) && data.changedNodesFailed.length > 0
      const backendStatus = hasChangedNodeFailures ? "failed" : (data.status || (data.step === "failed" ? "failed" : "ok"))
      setDeployStatus(backendStatus === "ok" ? "success" : backendStatus)
      if (data.step === "done" && !lines.includes("done")) lines.push("done")
      lines.push(`changedNodeIds(response): ${JSON.stringify(data.changedNodeIds || [])}`)
      lines.push(`changedNodesPersisted: ${JSON.stringify(data.changedNodesPersisted || [])}`)
      lines.push(`changedNodesSkipped: ${JSON.stringify(data.changedNodesSkipped || [])}`)
      lines.push(`changedNodesFailed: ${JSON.stringify(data.changedNodesFailed || [])}`)
      lines.push(`verificationByNodeId: ${JSON.stringify(data.verificationByNodeId || {}, null, 2)}`)
      lines.push(`persistedNodes: ${JSON.stringify(data.persistedNodes || [])}`)
      lines.push(`skippedNodes: ${JSON.stringify(data.skippedNodes || [])}`)
      lines.push(`failedNodes: ${JSON.stringify(data.failedNodes || [])}`)
      lines.push(`routeVersion: ${data.routeVersion || "missing"}`)
      lines.push(`step: ${data.step || "missing"}`)
      lines.push(`message: ${data.message || "missing"}`)
      lines.push(`envDiagnostics: ${JSON.stringify(envDiagnostics || null)}`)
      lines.push(`rawResponse: ${JSON.stringify(data)}`)
      setDeployDetails(lines.join("\n"))
      if (backendStatus === "ok" || backendStatus === "partial") {
        const baseline = new Map<string, string>()
        nodes.forEach((node, id) => baseline.set(id, getNodeSignature(node)))
        baselineNodeSignaturesRef.current = baseline
        dirtyNodeIdsRef.current.clear()
      }
    } catch (error) {
      setDeployStatus("failed")
      const message = error instanceof Error ? error.message : "Unknown error"
      setDeployDetails(`failed\nrouteVersion: missing\nstep: connecting\nmessage: ${message}\nenvDiagnostics: null`)
    }
  }

  const onCopyDeployDetails = async () => {
    if (!deployDetails) return
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(deployDetails)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = deployDetails
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopyState("copied")
    } catch {
      setCopyState("failed")
    }
  }

  const pointerRef = useRef<{
    mode: "move" | "resize" | null
    start: Point
    origin: NodeGeometry | null
    groupNodeIds: string[]
    groupOrigins: Record<string, NodeGeometry>
    handle: ResizeHandle | null
    nodeId: string | null
    lastGeometry: NodeGeometry | null
  }>({ mode: null, start: { x: 0, y: 0 }, origin: null, groupNodeIds: [], groupOrigins: {}, handle: null, nodeId: null, lastGeometry: null })
  const pointerScaleRef = useRef<{ origin: number; last: number }>({ origin: 1, last: 1 })
  const createPointerState = (
    partial: Partial<typeof pointerRef.current>
  ): typeof pointerRef.current => ({
    mode: partial.mode ?? null,
    start: partial.start ?? { x: 0, y: 0 },
    origin: partial.origin ?? null,
    groupNodeIds: partial.groupNodeIds ?? [],
    groupOrigins: partial.groupOrigins ?? {},
    handle: partial.handle ?? null,
    nodeId: partial.nodeId ?? null,
    lastGeometry: partial.lastGeometry ?? null,
  })

  const resolveResizeHandle = useCallback((rawHandle: ResizeHandle, nodeId: string, x: number, y: number): ResizeHandle => {
    const entry = registry.get(nodeId)
    const rect = entry?.element.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return rawHandle

    const localX = x - rect.left
    const localY = y - rect.top
    const cornerSize = Math.min(36, Math.max(22, Math.min(rect.width, rect.height) * 0.28))
    const horizontal =
      localX <= cornerSize && localX <= rect.width / 2
        ? "w"
        : localX >= rect.width - cornerSize && localX > rect.width / 2
          ? "e"
          : null
    const vertical =
      localY <= cornerSize && localY <= rect.height / 2
        ? "n"
        : localY >= rect.height - cornerSize && localY > rect.height / 2
          ? "s"
          : null

    if (vertical && horizontal) return `${vertical}${horizontal}` as ResizeHandle
    return rawHandle
  }, [registry])

  const arrangeNodeById = useCallback((nodeId: string) => {
    const node = nodesRef.current.get(nodeId)
    if (!node) return
    const dx = -node.geometry.x
    const dy = -node.geometry.y
    if (dx === 0 && dy === 0) return
    dispatch({ type: "MOVE_NODE", nodeId, dx, dy })
  }, [dispatch])

  const resetHeroImageFilters = useCallback((nodeId: "hero-bg-image" | "hero-logo") => {
    const node = nodesRef.current.get(nodeId)
    dispatch({
      type: node?.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
      nodeId,
      patch: HERO_IMAGE_FILTER_DEFAULTS,
    })
  }, [dispatch])

  const arrangeSelectedNodes = useCallback(() => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : [])
    if (targets.length === 0) return
    dispatch({ type: "BEGIN_TRANSACTION" })
    targets.forEach((nodeId) => arrangeNodeById(nodeId))
    targets.forEach((nodeId) => {
      if (nodeId === "hero-bg-image" || nodeId === "hero-logo") resetHeroImageFilters(nodeId)
    })
    dispatch({ type: "END_TRANSACTION" })
  }, [arrangeNodeById, dispatch, resetHeroImageFilters, selectedId, selectedIds])

  useEffect(() => {
    if (!isEditing) return
    document.body.setAttribute("data-editor-mode", "true")

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      const multiModifier = e.metaKey || e.ctrlKey
      const resizeHandleTarget = target.closest<HTMLElement>("[data-editor-resize-handle]")
      if (resizeHandleTarget instanceof HTMLElement) {
        e.preventDefault()
        e.stopPropagation()
        const rawHandle = (resizeHandleTarget.dataset.editorResizeHandle || null) as ResizeHandle | null
        const resizeNodeId = resizeHandleTarget.dataset.editorResizeNodeId || selectedId
        if (!resizeNodeId) return
        const n = nodes.get(resizeNodeId)
        if (!n || !rawHandle) return
        const handle = resolveResizeHandle(rawHandle, resizeNodeId, e.clientX, e.clientY)
        dispatch({ type: "SELECT_NODE", nodeId: resizeNodeId })
        dispatch({ type: "BEGIN_TRANSACTION" })
        pointerScaleRef.current = { origin: n.style.scale ?? 1, last: n.style.scale ?? 1 }
        pointerRef.current = createPointerState({
          mode: "resize",
          start: { x: e.clientX, y: e.clientY },
          origin: { ...n.geometry },
          handle,
          nodeId: resizeNodeId,
          lastGeometry: { ...n.geometry },
        })
        return
      }
      if (target.closest("[data-editor-toolbar]") || target.closest("[data-editor-panel]") || target.closest("[data-editor-overlay]") || target.closest("[data-editor-deploy-modal]")) return
      const hit = getEditableAtPosition(e.clientX, e.clientY)
      if (hit) {
        if (multiModifier) {
          e.preventDefault()
          e.stopPropagation()
          const current = selectedIdsRef.current
          let next: string[]
          if (current.includes(hit.id)) {
            next = current.filter((id) => id !== hit.id)
            if (next.length === 0) {
              dispatch({ type: "DESELECT_NODE" })
            } else {
              dispatch({ type: "SELECT_NODE", nodeId: next[0] })
            }
          } else {
            next = [...current, hit.id]
            dispatch({ type: "SELECT_NODE", nodeId: hit.id })
          }
          setSelectedIds(next)
          const bandMemberIndex = extractBandMemberIndex(hit.id)
          if (bandMemberIndex !== null) {
            window.dispatchEvent(new CustomEvent("editor-band-member-focus", { detail: { index: bandMemberIndex } }))
          }
          return
        }
        e.preventDefault()
        e.stopPropagation()
        dispatch({ type: "SELECT_NODE", nodeId: hit.id })
        setSelectedIds((prev) => (prev.length > 1 && prev.includes(hit.id) ? prev : [hit.id]))
        const bandMemberIndex = extractBandMemberIndex(hit.id)
        if (bandMemberIndex !== null) {
          window.dispatchEvent(new CustomEvent("editor-band-member-focus", { detail: { index: bandMemberIndex } }))
        }
        dispatch({ type: "BEGIN_TRANSACTION" })
        const currentSelected = selectedIdsRef.current
        const moveIds = currentSelected.length > 1 && currentSelected.includes(hit.id) ? currentSelected : [hit.id]
        const origins: Record<string, NodeGeometry> = {}
        moveIds.forEach((id) => {
          const node = nodesRef.current.get(id)
          if (node) origins[id] = { ...node.geometry }
        })
        const n = nodesRef.current.get(hit.id)
        pointerScaleRef.current = { origin: n?.style.scale ?? 1, last: n?.style.scale ?? 1 }
        pointerRef.current = createPointerState({
          mode: "move",
          start: { x: e.clientX, y: e.clientY },
          origin: n ? { ...n.geometry } : null,
          groupNodeIds: moveIds,
          groupOrigins: origins,
          handle: null,
          nodeId: hit.id,
          lastGeometry: n ? { ...n.geometry } : null,
        })
      } else {
        if (multiModifier) {
          marqueeRef.current = { active: true, start: { x: e.clientX, y: e.clientY } }
          setMarqueeRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 })
          return
        }
        dispatch({ type: "DESELECT_NODE" })
        setSelectedIds([])
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (marqueeRef.current.active) {
        const start = marqueeRef.current.start
        const x = Math.min(start.x, e.clientX)
        const y = Math.min(start.y, e.clientY)
        const width = Math.abs(e.clientX - start.x)
        const height = Math.abs(e.clientY - start.y)
        setMarqueeRect({ x, y, width, height })
        return
      }
      const state = pointerRef.current
      if (!state.mode || !state.origin || !state.nodeId) return
      const dx = e.clientX - state.start.x
      const dy = e.clientY - state.start.y
      if (state.mode === "move") {
        const groupIds = state.groupNodeIds.length > 0 ? state.groupNodeIds : [state.nodeId]
        groupIds.forEach((id) => {
          const origin = state.groupOrigins[id]
          if (!origin) return
          dispatch({
            type: "SET_NODE_GEOMETRY",
            nodeId: id,
            x: origin.x + dx,
            y: origin.y + dy,
            width: origin.width,
            height: origin.height,
            transient: true,
          })
        })
      } else if (state.mode === "resize" && state.origin && state.nodeId && state.handle) {
        const handle = state.handle
        const originScale = pointerScaleRef.current.origin || 1
        if (handle.length === 2) {
          const originVisualWidth = state.origin.width * originScale
          const originVisualHeight = state.origin.height * originScale
          const desiredVisualWidth = handle.includes("w") ? originVisualWidth - dx : originVisualWidth + dx
          const desiredVisualHeight = handle.includes("n") ? originVisualHeight - dy : originVisualHeight + dy
          const scaleX = desiredVisualWidth / Math.max(1, state.origin.width)
          const scaleY = desiredVisualHeight / Math.max(1, state.origin.height)
          const nextScaleCandidate = Math.abs(scaleX - originScale) >= Math.abs(scaleY - originScale) ? scaleX : scaleY
          const nextScale = Math.max(0.1, nextScaleCandidate)
          const nextX = handle.includes("w")
            ? state.origin.x + originVisualWidth - state.origin.width * nextScale
            : state.origin.x
          const nextY = handle.includes("n")
            ? state.origin.y + originVisualHeight - state.origin.height * nextScale
            : state.origin.y
          const geometry: NodeGeometry = {
            x: nextX,
            y: nextY,
            width: state.origin.width,
            height: state.origin.height,
          }
          pointerScaleRef.current.last = nextScale
          pointerRef.current.lastGeometry = geometry
          dispatch({ type: "SET_NODE_SCALE", nodeId: state.nodeId, scale: nextScale, transient: true })
          dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, ...geometry, transient: true, explicitSize: false })
          return
        }

        let nextX = state.origin.x
        let nextY = state.origin.y
        let nextWidth = state.origin.width
        let nextHeight = state.origin.height

        if (handle.includes("e")) nextWidth = state.origin.width + dx
        if (handle.includes("w")) {
          nextWidth = state.origin.width - dx
          nextX = state.origin.x + dx
        }
        if (handle.includes("s")) nextHeight = state.origin.height + dy
        if (handle.includes("n")) {
          nextHeight = state.origin.height - dy
          nextY = state.origin.y + dy
        }

        const minWidth = 8
        const minHeight = 8
        if (nextWidth < minWidth) {
          if (handle.includes("w")) nextX = state.origin.x + state.origin.width - minWidth
          nextWidth = minWidth
        }
        if (nextHeight < minHeight) {
          if (handle.includes("n")) nextY = state.origin.y + state.origin.height - minHeight
          nextHeight = minHeight
        }

        const geometry: NodeGeometry = { x: nextX, y: nextY, width: nextWidth, height: nextHeight }
        pointerRef.current.lastGeometry = geometry
        dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, ...geometry, transient: true })
      }
    }

    const onPointerUp = () => {
      if (marqueeRef.current.active) {
        const rect = marqueeRect
        marqueeRef.current = { active: false, start: { x: 0, y: 0 } }
        setMarqueeRect(null)
        if (!rect || rect.width < 4 || rect.height < 4) return
        const selected = Array.from(registry.values())
          .filter((entry) => {
            const r = entry.rect
            return !(r.right < rect.x || r.left > rect.x + rect.width || r.bottom < rect.y || r.top > rect.y + rect.height)
          })
          .map((entry) => entry.id)
        setSelectedIds(selected)
        if (selected.length > 0) {
          dispatch({ type: "SELECT_NODE", nodeId: selected[0] })
        } else {
          dispatch({ type: "DESELECT_NODE" })
        }
        return
      }
      const state = pointerRef.current
      if (state.mode === "resize" && state.nodeId && state.lastGeometry) {
        const g = state.lastGeometry
        if (state.handle?.length === 2) {
          dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, x: g.x, y: g.y, width: g.width, height: g.height, explicitSize: false })
          dispatch({ type: "SET_NODE_SCALE", nodeId: state.nodeId, scale: pointerScaleRef.current.last })
        } else {
          dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, x: g.x, y: g.y, width: g.width, height: g.height })
        }
      } else if (state.mode === "move") {
        const groupIds = state.groupNodeIds.length > 0 ? state.groupNodeIds : (state.nodeId ? [state.nodeId] : [])
        groupIds.forEach((id) => {
          const current = nodesRef.current.get(id)
          if (!current) return
          dispatch({
            type: "SET_NODE_GEOMETRY",
            nodeId: id,
            x: current.geometry.x,
            y: current.geometry.y,
            width: current.geometry.width,
            height: current.geometry.height,
          })
        })
      }
      pointerRef.current.mode = null
      pointerRef.current.origin = null
      pointerRef.current.groupNodeIds = []
      pointerRef.current.groupOrigins = {}
      pointerRef.current.handle = null
      pointerRef.current.nodeId = null
      pointerRef.current.lastGeometry = null
      pointerScaleRef.current = { origin: 1, last: 1 }
      dispatch({ type: "END_TRANSACTION" })
    }

    const shouldBlockPublicAction = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      if (target.closest("[data-editor-toolbar]") || target.closest("[data-editor-panel]") || target.closest("[data-editor-overlay]") || target.closest("[data-editor-deploy-modal]")) return false
      if (target.closest("[data-editor-node-id]")) return true
      if (target.closest("a,button,[role='button'],form")) return true
      return false
    }

    const blockPublicAction = (e: Event) => {
      if (!shouldBlockPublicAction(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      if ("stopImmediatePropagation" in e) {
        e.stopImmediatePropagation()
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditingInput(e.target)) return
      const isActivation = e.key === "Enter" || e.key === " "
      if (isActivation && shouldBlockPublicAction(e.target)) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c" && selectedId) {
        e.preventDefault()
        dispatch({ type: "COPY_NODE", nodeId: selectedId })
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x" && selectedId) {
        e.preventDefault()
        dispatch({ type: "CUT_NODE", nodeId: selectedId })
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault()
        dispatch({ type: "PASTE_NODE" })
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault()
        dispatch({ type: "DELETE_NODE", nodeId: selectedId })
      } else if (e.key === "Escape") {
        dispatch({ type: "DESELECT_NODE" })
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
    document.addEventListener("mousedown", blockPublicAction, true)
    document.addEventListener("mouseup", blockPublicAction, true)
    document.addEventListener("touchend", blockPublicAction, true)
    document.addEventListener("click", blockPublicAction, true)
    document.addEventListener("auxclick", blockPublicAction, true)
    document.addEventListener("contextmenu", blockPublicAction, true)
    document.addEventListener("dragstart", blockPublicAction, true)
    document.addEventListener("submit", blockPublicAction, true)
    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
      document.removeEventListener("mousedown", blockPublicAction, true)
      document.removeEventListener("mouseup", blockPublicAction, true)
      document.removeEventListener("touchend", blockPublicAction, true)
      document.removeEventListener("click", blockPublicAction, true)
      document.removeEventListener("auxclick", blockPublicAction, true)
      document.removeEventListener("contextmenu", blockPublicAction, true)
      document.removeEventListener("dragstart", blockPublicAction, true)
      document.removeEventListener("submit", blockPublicAction, true)
      window.removeEventListener("keydown", onKeyDown)
      document.body.removeAttribute("data-editor-mode")
    }
  }, [isEditing, dispatch, selectedId, selectedIds, undo, redo, getEditableAtPosition, resolveResizeHandle, marqueeRect, registry])

  if (isMobileEditBlocked) {
    return (
      <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/80 p-6 text-center text-white">
        <div className="max-w-md rounded-2xl border border-white/20 bg-black/70 p-6">
          <h2 className="text-xl font-semibold">Nice try 😌</h2>
          <p className="mt-3 text-sm text-white/85">This editor only works on desktop.</p>
          <p className="mt-1 text-sm text-white/85">Please open it on a computer.</p>
        </div>
      </div>
    )
  }

  if (!isEditing) {
    return null
  }

  const deployStatusColor =
    deployStatus === "success" ? "text-emerald-300" :
    deployStatus === "partial" ? "text-amber-300" :
    deployStatus === "failed" ? "text-red-300" :
    "text-slate-300"
  const deployStatusTitle =
    deployStatus === "success" ? "SUCCESS" :
    deployStatus === "partial" ? "PARTIAL" :
    deployStatus === "failed" ? "FAIL" :
    "SAVING"
  const deployStatusMessage =
    deployStatus === "success" ? "Todo quedó bien publicado." :
    deployStatus === "partial" ? "Casi todo pasó, pero hay detalles que revisar." :
    deployStatus === "failed" ? "El deploy no terminó limpio." :
    "El deploy está corriendo."
  const deployStatusPanelClass =
    deployStatus === "success" ? "border-emerald-400/40 bg-emerald-500/10 shadow-emerald-950/40" :
    deployStatus === "partial" ? "border-amber-400/45 bg-amber-500/10 shadow-amber-950/40" :
    deployStatus === "failed" ? "border-red-400/45 bg-red-500/10 shadow-red-950/40" :
    "border-slate-400/30 bg-slate-500/10 shadow-black/30"
  const deployDetailsLines = deployDetails?.split("\n").filter((line) => line.trim().length > 0) ?? []
  const deployPersistedLines = deployDetailsLines.filter((line) => /persisted|saved|done|success|updated/i.test(line))
  const deploySkippedLines = deployDetailsLines.filter((line) => /partial|skipped|warning|nonPersistable/i.test(line))
  const deployFailedLines = deployDetailsLines.filter((line) => /failed|error|mismatch/i.test(line))

  return (
    <>
      <div data-editor-toolbar className="fixed top-3 left-3 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-3 py-2 text-white">
        <button aria-label="Undo" title="Undo" onClick={undo} disabled={!canUndo} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
          ↶
        </button>
        <button aria-label="Redo" title="Redo" onClick={redo} disabled={!canRedo} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
          ↷
        </button>
        <button aria-label="Deploy" title="Deploy" onClick={onDeploy} className="rounded p-1.5 hover:bg-white/10">
          🚀
        </button>
        <button aria-label="Exit" title="Exit" onClick={exitEditor} className="rounded p-1.5 hover:bg-white/10">
          ⎋
        </button>
        {deployStatus && (
          <span className="ml-1 rounded bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {deployStatus}
          </span>
        )}
      </div>

      <div data-editor-toolbar className="fixed top-3 right-3 z-[9999] text-white">
        <div className="relative">
          <button
            type="button"
            aria-label="Add block"
            title="Add block"
            onClick={() => {
              setAddMenuOpen((value) => !value)
              setAddMessage(null)
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-semibold leading-none text-slate-950 shadow-2xl hover:bg-slate-100"
          >
            +
          </button>
          {addMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-white/15 bg-[#111827] py-1 text-sm shadow-2xl">
              {(["text", "button", "card", "overlay"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-white hover:bg-white/10"
                  onClick={() => addExtraNode(kind)}
                >
                  {kind === "text" ? "Add Text" : kind === "button" ? "Add Button" : kind === "card" ? "Add Card" : "Add Overlay"}
                </button>
              ))}
            </div>
          )}
        </div>
        {addMessage && (
          <div className="mt-2 max-w-64 rounded-lg border border-amber-300/40 bg-amber-950/90 px-3 py-2 text-xs text-amber-50 shadow-xl">
            {addMessage}
          </div>
        )}
      </div>

      {deployDetails && (
        <div data-editor-deploy-modal className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg border border-white/20 bg-[#111827] text-slate-100 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="px-4 pt-4 text-sm font-semibold text-white">Deploy result</h3>
              <button
                type="button"
                onClick={() => { setDeployDetails(null); setDeployDetailsExpanded(false); setCopyState("idle") }}
                className="mr-4 mt-4 rounded border border-white/30 px-2 py-1 text-xs text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="px-4 pb-4">
              <div className={`rounded-lg border p-5 text-center shadow-xl ${deployStatusPanelClass}`}>
                <div className={`text-4xl font-black tracking-[0.18em] ${deployStatusColor}`}>{deployStatusTitle}</div>
                <p className="mt-2 text-sm font-medium text-white/85">{deployStatusMessage}</p>
              </div>

              <button
                type="button"
                onClick={() => setDeployDetailsExpanded((value) => !value)}
                className="mt-4 flex w-full items-center justify-between rounded border border-white/15 bg-white/[0.03] px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/[0.07]"
                aria-expanded={deployDetailsExpanded}
              >
                <span>{deployDetailsExpanded ? "▼ Ocultar detalles" : "▶ Ver detalles técnicos"}</span>
                <span className="text-xs text-white/50">{deployDetailsLines.length} líneas</span>
              </button>

              {deployDetailsExpanded && (
                <div className="mt-3 max-h-[46vh] space-y-3 overflow-auto rounded border border-white/15 bg-black/25 p-3">
                  {deployPersistedLines.length > 0 && (
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">Persisted / Success</h4>
                      <pre className="whitespace-pre-wrap rounded bg-black/30 p-2 text-xs text-slate-100 select-text">{deployPersistedLines.join("\n")}</pre>
                    </div>
                  )}
                  {deploySkippedLines.length > 0 && (
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Skipped / Warnings</h4>
                      <pre className="whitespace-pre-wrap rounded bg-black/30 p-2 text-xs text-slate-100 select-text">{deploySkippedLines.join("\n")}</pre>
                    </div>
                  )}
                  {deployFailedLines.length > 0 && (
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-300">Failed / Errors</h4>
                      <pre className="whitespace-pre-wrap rounded bg-black/30 p-2 text-xs text-slate-100 select-text">{deployFailedLines.join("\n")}</pre>
                    </div>
                  )}
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Full technical log</h4>
                    <pre className="whitespace-pre-wrap rounded bg-black/35 p-3 text-xs text-slate-100 select-text">{deployDetails}</pre>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
              <button type="button" onClick={onCopyDeployDetails} className="rounded border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10">
                Copy details
              </button>
              {copyState === "copied" && <span className="text-xs text-emerald-300">Copied</span>}
              {copyState === "failed" && <span className="text-xs text-red-300">Copy failed</span>}
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0
        ? selectedIds
            .map((id) => registry.get(id))
            .filter((entry): entry is RuntimeEntry => Boolean(entry))
            .map((entry) => <SelectionOverlay key={entry.id} entry={entry} />)
        : selectedEntry && <SelectionOverlay entry={selectedEntry} />}

      {marqueeRect && (
        <div
          className="pointer-events-none fixed z-[10002] border border-[#FF8C21] bg-[#FF8C21]/15"
          style={{
            left: `${marqueeRect.x}px`,
            top: `${marqueeRect.y}px`,
            width: `${marqueeRect.width}px`,
            height: `${marqueeRect.height}px`,
          }}
        />
      )}

      {openPanel && selectedNode && (
        <div data-editor-panel className="fixed right-3 top-16 z-[9997] flex max-h-[calc(100dvh-5rem)] w-72 flex-col overflow-hidden rounded-xl bg-white text-slate-900 shadow-2xl">
          <div className="shrink-0 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-3 py-2 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{selectedNode.label}</div>
                <div className="text-[10px] capitalize">{selectedNode.type}</div>
              </div>
              <button onClick={() => { dispatch({ type: "DESELECT_NODE" }); setOpenPanel(false) }}>×</button>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 text-slate-900"
            onWheel={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
              onClick={arrangeSelectedNodes}
            >
              {selectedNode.id === "hero-bg-image" || selectedNode.id === "hero-logo" ? "Arrange + Reset image filters" : "Arrange / Auto-position"}
            </button>
            {selectedBandMemberIndex !== null && (
              <div className="space-y-2 rounded border border-slate-200 p-2">
                <label className="text-[11px] font-semibold">Member Number</label>
                <input
                  key={`member-number-${selectedBandMemberIndex}`}
                  className="w-full rounded border p-1 text-xs"
                  defaultValue={getBandMemberFieldValue(selectedBandMemberIndex, "number")}
                  onInput={(e) => updateBandMemberField(selectedBandMemberIndex, "number", (e.target as HTMLInputElement).value)}
                />
                <label className="text-[11px] font-semibold">Member Name</label>
                <input
                  key={`member-name-${selectedBandMemberIndex}`}
                  className="w-full rounded border p-1 text-xs"
                  defaultValue={getBandMemberFieldValue(selectedBandMemberIndex, "name")}
                  onInput={(e) => updateBandMemberField(selectedBandMemberIndex, "name", (e.target as HTMLInputElement).value)}
                />
                <label className="text-[11px] font-semibold">Member Role</label>
                <input
                  key={`member-role-${selectedBandMemberIndex}`}
                  className="w-full rounded border p-1 text-xs"
                  defaultValue={getBandMemberFieldValue(selectedBandMemberIndex, "role")}
                  onInput={(e) => updateBandMemberField(selectedBandMemberIndex, "role", (e.target as HTMLInputElement).value)}
                />
                <label className="text-[11px] font-semibold">Upload/Change Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const url = URL.createObjectURL(file)
                    setHasNonPersistableUpload(true)
                    updateBandMemberField(selectedBandMemberIndex, "photo", url)
                  }}
                />
                {hasNonPersistableUpload && (
                  <p className="text-[10px] text-amber-700">
                    Local blob preview only. Upload to Sanity asset URL before relying on deploy persistence.
                  </p>
                )}
              </div>
            )}


            {(selectedNode.type === "text" || selectedNode.type === "button") &&
              !(selectedNode.type === "text" && selectedNode.id === "hero-title" && heroTitleSegments.length > 0) &&
              !(selectedNode.type === "text" && selectedNode.id === "hero-subtitle" && heroSubtitleSegments.length > 0) &&
              canUseSimpleTextTools && (
              <>
                <label className="text-xs font-semibold">Content</label>
                <textarea
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.content.text || ""}
                  onChange={(e) => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { text: e.target.value } })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px]">Text Color</label>
                    <input
                      type="color"
                      className="h-8 w-full rounded border p-1"
                      value={selectedNode.style.color || "#ffffff"}
                      onChange={(e) => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { color: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px]">Font Size</label>
                    <input
                      className="w-full rounded border p-1 text-xs"
                      value={selectedNode.style.fontSize || ""}
                      onChange={(e) => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { fontSize: e.target.value } })}
                      placeholder="e.g. 24px"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px]">Font Family</label>
                  <select
                    className="w-full rounded border p-1 text-xs"
                    value={selectedNode.style.fontFamily || "inherit"}
                    onChange={(e) => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { fontFamily: e.target.value } })}
                  >
                    {TEXT_FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px]">Text Align</label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        className={`rounded border px-2 py-1 text-xs capitalize ${selectedNode.style.textAlign === align || (!selectedNode.style.textAlign && align === "left") ? "bg-slate-900 text-white" : ""}`}
                        onClick={() => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { textAlign: align } })}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`rounded border px-2 py-1 text-xs ${selectedNode.style.fontWeight === "700" ? "bg-slate-900 text-white" : ""}`}
                    onClick={() => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { fontWeight: selectedNode.style.fontWeight === "700" ? "400" : "700" } })}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-2 py-1 text-xs italic ${selectedNode.style.fontStyle === "italic" ? "bg-slate-900 text-white" : ""}`}
                    onClick={() => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { fontStyle: selectedNode.style.fontStyle === "italic" ? "normal" : "italic" } })}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-2 py-1 text-xs underline ${selectedNode.style.textDecoration === "underline" ? "bg-slate-900 text-white" : ""}`}
                    onClick={() => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { textDecoration: selectedNode.style.textDecoration === "underline" ? "none" : "underline" } })}
                  >
                    U
                  </button>
                  {supportsTextShadowTool(selectedNode.id) && (
                    <button
                      type="button"
                      title="Text shadow"
                      className={`rounded border px-2 py-1 text-xs ${selectedNode.style.textShadowEnabled ? "bg-slate-900 text-white" : ""}`}
                      onClick={() => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { textShadowEnabled: !selectedNode.style.textShadowEnabled } })}
                    >
                      S
                    </button>
                  )}
                </div>
                <div className="mt-3 rounded border border-slate-200 p-2">
                  <label className="text-[10px] font-semibold">Gradient</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="gradient-enabled"
                      checked={(selectedNode.style as any).gradientEnabled || false}
                      onChange={(e) => {
                        console.log("[TEXT-GRADIENT-UI][toggle]", { nodeId: selectedNode.id, newValue: e.target.checked })
                        dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { gradientEnabled: e.target.checked } })
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-[10px]">Enable gradient</span>
                  </div>
                  {(selectedNode.style as any).gradientEnabled && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px]">Start</label>
                        <input
                          type="color"
                          className="h-8 w-full rounded border p-1"
                          value={(selectedNode.style as any).gradientStart || "#FFB15A"}
                          onChange={(e) => {
                            console.log("[TEXT-GRADIENT-UI][start-change]", { nodeId: selectedNode.id, newValue: e.target.value })
                            dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { gradientStart: e.target.value } })
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px]">End</label>
                        <input
                          type="color"
                          className="h-8 w-full rounded border p-1"
                          value={(selectedNode.style as any).gradientEnd || "#FF6C00"}
                          onChange={(e) => {
                            console.log("[TEXT-GRADIENT-UI][end-change]", { nodeId: selectedNode.id, newValue: e.target.value })
                            dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { gradientEnd: e.target.value } })
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedNode.type === "button" && (
              <>
                <label className="text-[10px]">Background Color</label>
                <input
                  type="color"
                  className="h-8 w-full rounded border p-1"
                  value={readColorHex(selectedNode.style.backgroundColor, "#ff8c21")}
                  onChange={(e) => dispatch({
                    type: "UPDATE_BUTTON",
                    nodeId: selectedNode.id,
                    patch: { backgroundColor: withColorOpacity(e.target.value, readColorOpacity(selectedNode.style.backgroundColor)) },
                  })}
                />
                <label className="text-[10px]">Button opacity ({readColorOpacity(selectedNode.style.backgroundColor).toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                  value={readColorOpacity(selectedNode.style.backgroundColor)}
                  onChange={(e) => {
                    dispatch({ type: "UPDATE_BUTTON", nodeId: selectedNode.id, patch: buildBoxOpacityPatch(selectedNode.id, Number(e.target.value)) })
                  }}
                />
                {selectedNode.id !== "about-copy-button" && selectedNode.id !== "press-kit-download-button" && (
                  <>
                    <label className="text-xs font-semibold">Link</label>
                    <input
                      className="w-full rounded border p-1 text-xs"
                      value={selectedNode.content.href || ""}
                      onChange={(e) => dispatch({ type: "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { href: e.target.value } })}
                    />
                  </>
                )}
                {selectedNode.id === "press-kit-download-button" && (
                  <div className="space-y-2 rounded border border-slate-200 p-2">
                    <label className="text-xs font-semibold">Download file</label>
                    <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                      <div><span className="font-semibold">Current:</span> {selectedNode.content.fileName || selectedNode.content.href?.split("/").pop() || "No file selected"}</div>
                      <div className="mt-1 break-all text-slate-500">{selectedNode.content.href || "Missing download URL"}</div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.zip,.doc,.docx,.txt,application/pdf,application/zip"
                      className="w-full text-xs"
                      onChange={async (e) => {
                        const input = e.currentTarget
                        const file = input.files?.[0]
                        if (!file) return
                        try {
                          const formData = new FormData()
                          formData.append("file", file)
                          formData.append("nodeId", selectedNode.id)
                          formData.append("assetType", "file")
                          const uploadRes = await fetch("/api/editor-upload-asset", {
                            method: "POST",
                            body: formData,
                          })
                          const data = await uploadRes.json() as { url?: string; filename?: string; error?: string }
                          if (!uploadRes.ok || !data.url) {
                            console.error("[press-kit-file-upload] Upload failed.", { status: uploadRes.status, error: data.error })
                            return
                          }
                          dispatch({
                            type: "UPDATE_BUTTON",
                            nodeId: selectedNode.id,
                            patch: { href: data.url, fileName: data.filename || file.name },
                          })
                        } catch (error) {
                          console.error("[press-kit-file-upload] Upload exception.", error)
                        } finally {
                          input.value = ""
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {/^press-kit-resource-\d+$/.test(selectedNode.id) && (
              <div className="space-y-2 rounded border border-slate-200 p-2">
                <label className="text-xs font-semibold">Press Kit Resource</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  placeholder="Resource title"
                  value={selectedNode.content.title || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { title: e.target.value } })}
                />
                <textarea
                  className="w-full rounded border p-1 text-xs"
                  rows={2}
                  placeholder="Resource description"
                  value={selectedNode.content.description || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { description: e.target.value } })}
                />
                <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                  <div className="font-semibold">Current gallery assets</div>
                  <div className="mt-2 space-y-2">
                    {(selectedNode.content.assets || []).map((asset, index) => (
                      <div key={`${asset.url}-${index}`} className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-white p-2">
                        <div className="min-w-0">
                          <input
                            className="mb-1 w-full rounded border p-1 text-[11px]"
                            value={asset.label}
                            onChange={(e) => {
                              const nextAssets = [...(selectedNode.content.assets || [])]
                              nextAssets[index] = { ...asset, label: e.target.value }
                              dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { assets: nextAssets } })
                            }}
                          />
                          <div className="break-all text-slate-500">{asset.fileName || asset.url}</div>
                        </div>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-[10px]"
                          onClick={() => {
                            const nextAssets = (selectedNode.content.assets || []).filter((_, assetIndex) => assetIndex !== index)
                            dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { assets: nextAssets } })
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {(selectedNode.content.assets || []).length === 0 && (
                      <div className="text-slate-500">No assets in this gallery.</div>
                    )}
                  </div>
                </div>
                <label className="text-[10px] font-semibold">Add gallery asset</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs"
                  onChange={async (e) => {
                    const input = e.currentTarget
                    const file = input.files?.[0]
                    if (!file) return
                    try {
                      const formData = new FormData()
                      formData.append("file", file)
                      formData.append("nodeId", selectedNode.id)
                      const uploadRes = await fetch("/api/editor-upload-asset", { method: "POST", body: formData })
                      const data = await uploadRes.json() as { url?: string; filename?: string; error?: string }
                      if (!uploadRes.ok || !data.url) {
                        console.error("[press-kit-resource-upload] Upload failed.", { nodeId: selectedNode.id, status: uploadRes.status, error: data.error })
                        return
                      }
                      dispatch({
                        type: "UPDATE_CARD",
                        nodeId: selectedNode.id,
                        patch: {
                          assets: [
                            ...(selectedNode.content.assets || []),
                            { label: data.filename || file.name, url: data.url, fileName: data.filename || file.name },
                          ],
                        },
                      })
                    } catch (error) {
                      console.error("[press-kit-resource-upload] Upload exception.", error)
                    } finally {
                      input.value = ""
                    }
                  }}
                />
              </div>
            )}

            {selectedNode.id === "press-kit-manager" && (
              <div className="space-y-2 rounded border border-slate-200 p-2">
                <label className="text-xs font-semibold">Manager popup</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  placeholder="Card title"
                  value={selectedNode.content.title || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { title: e.target.value } })}
                />
                <input
                  className="w-full rounded border p-1 text-xs"
                  placeholder="Manager name"
                  value={selectedNode.content.text || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { text: e.target.value } })}
                />
                <input
                  className="w-full rounded border p-1 text-xs"
                  placeholder="Role"
                  value={selectedNode.content.role || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { role: e.target.value } })}
                />
                <label className="text-[10px] font-semibold">Link / Email destination</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  placeholder="Email"
                  value={selectedNode.content.email || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { email: e.target.value } })}
                />
                <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                  <div className="font-semibold">Current photo</div>
                  <div className="mt-1 break-all text-slate-500">{selectedNode.content.src || "Missing manager photo"}</div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs"
                  onChange={async (e) => {
                    const input = e.currentTarget
                    const file = input.files?.[0]
                    if (!file) return
                    try {
                      const formData = new FormData()
                      formData.append("file", file)
                      formData.append("nodeId", selectedNode.id)
                      const uploadRes = await fetch("/api/editor-upload-asset", { method: "POST", body: formData })
                      const data = await uploadRes.json() as { url?: string; error?: string }
                      if (!uploadRes.ok || !data.url) {
                        console.error("[press-kit-manager-photo-upload] Upload failed.", { status: uploadRes.status, error: data.error })
                        return
                      }
                      dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { src: data.url } })
                    } catch (error) {
                      console.error("[press-kit-manager-photo-upload] Upload exception.", error)
                    } finally {
                      input.value = ""
                    }
                  }}
                />
              </div>
            )}

            {isFooterSocialGroup && footerSocialLinkItems.length > 0 && (
              <>
                <label className="text-xs font-semibold">Footer Social Links</label>
                <div className="space-y-2 rounded border border-slate-200 p-2">
                  {footerSocialLinkItems.map((item) => (
                    <div key={`footer-social-link-${item.id}`} className="space-y-1">
                      <label className="text-[10px] font-semibold">{item.name}</label>
                      <input
                        className="w-full rounded border p-1 text-xs"
                        value={item.href}
                        onChange={(e) => dispatch({ type: "UPDATE_BUTTON", nodeId: item.id, patch: { href: e.target.value } })}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedNode.id === "live-section-concerts-container" && selectedNode.type === "card" && (
              <>
                <label className="text-xs font-semibold">Concerts</label>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-slate-200 p-2 overscroll-contain">
                  {(selectedNode.content.concerts || []).length === 0 && (
                    <p className="text-[11px] text-slate-500">No concerts are listed on the public source right now.</p>
                  )}
                  {(selectedNode.content.concerts || []).map((concert) => (
                    <div key={`live-concert-row-${concert._editorId}`} className="flex items-center justify-between gap-2 rounded bg-slate-50 p-2 text-xs">
                      <span className="min-w-0 truncate">
                        {concert.date || "No date"} · {concert.locationName || "No location"} · {concert.status || "Upcoming"}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded border border-red-200 px-2 py-1 text-red-700"
                        onClick={() => {
                          const nextConcerts = (selectedNode.content.concerts || []).filter((item) => item._editorId !== concert._editorId)
                          updateLiveConcertsContainer(nextConcerts)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => {
                    const concerts = selectedNode.content.concerts || []
                    const nextId = concerts.reduce((max, concert) => Math.max(max, concert._editorId), -1) + 1
                    updateLiveConcertsContainer([
                      ...concerts,
                      {
                        _editorId: nextId,
                        date: "",
                        time: "",
                        locationName: "",
                        locationLink: "",
                        style: "World Music",
                        price: "",
                        status: "Upcoming",
                      },
                    ])
                  }}
                >
                  + Add concert
                </button>
                <label className="text-[10px]">Container background</label>
                <input
                  type="color"
                  className="h-8 w-full rounded border p-1"
                  value={readColorHex(selectedNode.style.backgroundColor, "#000000")}
                  onChange={(e) => dispatch({
                    type: "UPDATE_CARD",
                    nodeId: selectedNode.id,
                    patch: { backgroundColor: withColorOpacity(e.target.value, readColorOpacity(selectedNode.style.backgroundColor)) },
                  })}
                />
                <label className="text-[10px]">Container opacity ({readColorOpacity(selectedNode.style.backgroundColor).toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                  value={readColorOpacity(selectedNode.style.backgroundColor)}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: buildBoxOpacityPatch(selectedNode.id, Number(e.target.value)) })}
                />
              </>
            )}

            {selectedLiveConcertCard && selectedNode.type === "card" && (
              <>
                <label className="text-xs font-semibold">Concert card</label>
                <label className="text-[10px]">Date</label>
                <input className="w-full rounded border p-1 text-xs" type="date" value={selectedLiveConcertCard.date} onChange={(e) => updateSelectedLiveConcertCard({ date: e.target.value })} />
                <label className="text-[10px]">Time</label>
                <input className="w-full rounded border p-1 text-xs" value={selectedLiveConcertCard.time} onChange={(e) => updateSelectedLiveConcertCard({ time: e.target.value })} />
                <label className="text-[10px]">Location name</label>
                <input className="w-full rounded border p-1 text-xs" value={selectedLiveConcertCard.locationName} onChange={(e) => updateSelectedLiveConcertCard({ locationName: e.target.value })} />
                <label className="text-[10px]">Google Maps URL</label>
                <input className="w-full rounded border p-1 text-xs" value={selectedLiveConcertCard.locationLink} onChange={(e) => updateSelectedLiveConcertCard({ locationLink: e.target.value })} />
                <label className="text-[10px]">Style</label>
                <select className="w-full rounded border p-1 text-xs" value={selectedLiveConcertCard.style} onChange={(e) => updateSelectedLiveConcertCard({ style: e.target.value })}>
                  {["World Music", "Funk", "Soul", "Reggae", "Global Grooves"].map((style) => <option key={style} value={style}>{style}</option>)}
                </select>
                <label className="text-[10px]">Price</label>
                <input className="w-full rounded border p-1 text-xs" value={selectedLiveConcertCard.price} onChange={(e) => updateSelectedLiveConcertCard({ price: e.target.value })} />
                <label className="text-[10px]">Status</label>
                <select className="w-full rounded border p-1 text-xs" value={selectedLiveConcertCard.status} onChange={(e) => updateSelectedLiveConcertCard({ status: e.target.value })}>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </>
            )}

            {selectedNode.id === "navigation-inner" && selectedNode.type === "card" && (
              <>
                <label className="text-[10px]">Background Color</label>
                <input
                  type="color"
                  className="h-8 w-full rounded border p-1"
                  value={selectedNode.style.backgroundColor || "#000000"}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { backgroundColor: e.target.value } })}
                />
                <label className="text-[10px]">Card Opacity ({readColorOpacity(selectedNode.style.backgroundColor).toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                  value={readColorOpacity(selectedNode.style.backgroundColor)}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: buildBoxOpacityPatch(selectedNode.id, Number(e.target.value)) })}
                />
              </>
            )}

            {(selectedNode.type === "image" || (selectedNode.type === "background" && selectedNode.content.mediaKind !== "video")) && (
              <>
                <label className="text-xs font-semibold">Asset</label>
                <select
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.content.src || ""}
                  onChange={(e) => dispatch({
                    type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                    nodeId: selectedNode.id,
                    patch: {
                      src: e.target.value,
                      mediaKind: "image",
                      ...(selectedNode.id === "hero-bg-image" || selectedNode.id === "hero-logo" ? HERO_IMAGE_FILTER_DEFAULTS : {}),
                    },
                  })}
                >
                  <option value="">Select asset</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.url}>{a.filename}</option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return

                    const requiresSanityAsset =
                      selectedNode.id === "hero-logo" ||
                      selectedNode.id === "hero-bg-image" ||
                      selectedNode.id === "about-bg-image" ||
                      selectedNode.id === "band-members-bg" ||
                      selectedNode.id === "live-section-bg-image" ||
                      selectedNode.id === "contact-bg-image" ||
                      selectedNode.id === "footer-logo" ||
                      /^member-item-\d+-image$/.test(selectedNode.id)

                    if (requiresSanityAsset) {
                      try {
                        const formData = new FormData()
                        formData.append("file", file)
                        formData.append("nodeId", selectedNode.id)
                        const uploadRes = await fetch("/api/editor-upload-asset", {
                          method: "POST",
                          body: formData
                        })
                        if (uploadRes.ok) {
                          const data = await uploadRes.json() as { url?: string; error?: string }
                          if (data.url) {
                            dispatch({
                              type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                              nodeId: selectedNode.id,
                              patch: {
                                src: data.url,
                                mediaKind: "image",
                                ...(selectedNode.id === "hero-bg-image" || selectedNode.id === "hero-logo" ? HERO_IMAGE_FILTER_DEFAULTS : {}),
                              },
                            })
                            return
                          }
                          console.error("[hero-asset-upload] Upload succeeded without an asset URL.", {
                            nodeId: selectedNode.id,
                            error: data.error || null,
                          })
                        } else {
                          const text = await uploadRes.text()
                          try {
                            const error = JSON.parse(text) as { error?: string }
                            console.error("[hero-asset-upload] Upload failed.", { nodeId: selectedNode.id, status: uploadRes.status, error: error.error })
                          } catch {
                            console.error("[hero-asset-upload] Upload failed.", { nodeId: selectedNode.id, status: uploadRes.status, text: text.substring(0, 200) })
                          }
                        }
                      } catch (err) {
                        console.error("[hero-asset-upload] Upload exception.", {
                          nodeId: selectedNode.id,
                          error: err instanceof Error ? err.message : String(err)
                        })
                      }
                    }

                    // Doc-backed image nodes must deploy as Sanity CDN URLs. Other image nodes can keep a local blob preview.
                    if (!requiresSanityAsset) {
                      const url = URL.createObjectURL(file)
                      setHasNonPersistableUpload(true)
                      dispatch({
                        type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                        nodeId: selectedNode.id,
                        patch: { src: url, mediaKind: "image" },
                      })
                    } else {
                      console.warn("[hero-asset-upload] Local blob preview was not applied.", {
                        nodeId: selectedNode.id,
                        reason: "This image node requires a Sanity CDN URL before deploy.",
                      })
                    }
                  }}
                />
                {hasNonPersistableUpload && (
                  <p className="text-[10px] text-amber-700">
                    Blob preview detected. This src is not persistible in deploy.
                  </p>
                )}
                {(selectedNode.content.mediaKind !== "video") && (
                  <>
                    <div>
                      <label className="text-[10px]">Contrast ({Math.round(selectedNode.style.contrast ?? 100)}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                        value={selectedNode.style.contrast ?? 100}
                        onChange={(e) => dispatch({
                          type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                          nodeId: selectedNode.id,
                          patch: { contrast: Number(e.target.value) },
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px]">Opacity ({Math.round((selectedNode.style.opacity ?? 1) * 100)}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        className="w-full"
                        value={selectedNode.style.opacity ?? 1}
                        onChange={(e) => dispatch({
                          type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                          nodeId: selectedNode.id,
                          patch: { opacity: Number(e.target.value) },
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px]">Saturation ({Math.round(selectedNode.style.saturation ?? 100)}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                        value={selectedNode.style.saturation ?? 100}
                        onChange={(e) => dispatch({
                          type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                          nodeId: selectedNode.id,
                          patch: { saturation: Number(e.target.value) },
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px]">Brightness ({Math.round(selectedNode.style.brightness ?? 100)}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                        value={selectedNode.style.brightness ?? 100}
                        onChange={(e) => dispatch({
                          type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                          nodeId: selectedNode.id,
                          patch: { brightness: Number(e.target.value) },
                        })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedNode.style.negative ?? false}
                        onChange={(e) => dispatch({
                          type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                          nodeId: selectedNode.id,
                          patch: { negative: e.target.checked },
                        })}
                      />
                      Negativo
                    </label>
                    {(selectedNode.id === "hero-bg-image" || selectedNode.id === "hero-logo") && (
                      <button
                        type="button"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                        onClick={() => resetHeroImageFilters(selectedNode.id as "hero-bg-image" | "hero-logo")}
                      >
                        Reset image filters to current base
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {selectedNode.type === "background" && selectedNode.content.mediaKind === "video" && (
              <>
                <label className="text-[10px]">Opacity ({(selectedNode.style.opacity ?? 1).toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                  value={selectedNode.style.opacity ?? 1}
                  onChange={(e) => dispatch({ type: "UPDATE_BACKGROUND", nodeId: selectedNode.id, patch: { opacity: Number(e.target.value) } })}
                />
                <label className="text-xs font-semibold">Background video sources</label>
                {Array.from({ length: 3 }).map((_, index) => {
                  const sources = selectedNode.content.videoSources?.length
                    ? selectedNode.content.videoSources
                    : normalizeEditorVideoSources([{ type: "youtube", url: selectedNode.content.videoUrl || "" }])
                  const sourceUrl = sources[index]?.url || ""
                  return (
                    <div key={index} className="space-y-1 rounded border border-black/10 p-2">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span>Source {index + 1}</span>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={sources[index]?.enabled ?? Boolean(sourceUrl)}
                            onChange={(e) => {
                              const nextRawSources = Array.from({ length: 3 }).map((__, sourceIndex) => ({
                                type: "youtube",
                                url: sources[sourceIndex]?.url || "",
                                youtubeId: sources[sourceIndex]?.youtubeId || "",
                                enabled: sourceIndex === index ? e.target.checked : sources[sourceIndex]?.enabled ?? Boolean(sources[sourceIndex]?.url),
                                order: sourceIndex + 1,
                              }))
                              const nextSources = normalizeEditorVideoSources(nextRawSources)
                              dispatch({
                                type: "UPDATE_BACKGROUND",
                                nodeId: selectedNode.id,
                                patch: {
                                  videoUrl: nextSources.find((source) => source.enabled)?.url || nextSources[0]?.url || "",
                                  videoSources: nextSources,
                                  mediaKind: "video",
                                },
                              })
                            }}
                          />
                          Enabled
                        </label>
                      </div>
                      <input
                        className="w-full rounded border p-1 text-xs"
                        placeholder={`YouTube source ${index + 1}`}
                        value={sourceUrl}
                        onChange={(e) => {
                          const nextRawSources = Array.from({ length: 3 }).map((__, sourceIndex) => ({
                            type: "youtube",
                            url: sourceIndex === index ? e.target.value : sources[sourceIndex]?.url || "",
                            youtubeId: sources[sourceIndex]?.youtubeId || "",
                            enabled: sources[sourceIndex]?.enabled ?? true,
                            order: sourceIndex + 1,
                          }))
                          const nextSources = normalizeEditorVideoSources(nextRawSources)
                          dispatch({
                            type: "UPDATE_BACKGROUND",
                            nodeId: selectedNode.id,
                            patch: {
                              videoUrl: nextSources.find((source) => source.enabled)?.url || nextSources[0]?.url || "",
                              videoSources: nextSources,
                              mediaKind: "video",
                            },
                          })
                        }}
                      />
                    </div>
                  )
                })}
              </>
            )}

            {/* Advanced Size UI removed - use visual resize handles instead */}

            {selectedNode.type === "section" && (
              <>
                {(selectedNode.id === "navigation" || selectedNode.id === "about-section") && (
                  <>
                    <label className="text-[10px]">{selectedNode.id === "navigation" ? "Navigation" : "About"} background color</label>
                    <input
                      type="color"
                      className="h-8 w-full rounded border p-1"
                      value={readColorHex(selectedNode.style.backgroundColor, "#000000")}
                      onChange={(e) => dispatch({
                        type: "UPDATE_SECTION",
                        nodeId: selectedNode.id,
                        patch: { backgroundColor: withColorOpacity(e.target.value, readColorOpacity(selectedNode.style.backgroundColor || "#00000080")) },
                      })}
                    />
                    <label className="text-[10px]">Background opacity ({readColorOpacity(selectedNode.style.backgroundColor || "#00000080").toFixed(2)})</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full"
                      value={readColorOpacity(selectedNode.style.backgroundColor || "#00000080")}
                      onChange={(e) => dispatch({ type: "UPDATE_SECTION", nodeId: selectedNode.id, patch: buildBoxOpacityPatch(selectedNode.id, Number(e.target.value)) })}
                    />
                  </>
                )}
              </>
            )}

            {isSimpleEditableBox && (
              <>
                {selectedNode.type === "card" && !isExtraNodeId(selectedNode.id) && selectedNode.id !== "latest-release-card" && selectedNode.id !== "about-text-card" && !/^member-item-\d+$/.test(selectedNode.id) && !/^press-kit-resource-\d+$/.test(selectedNode.id) && selectedNode.id !== "press-kit-manager" && (
                  <>
                    <label className="text-xs font-semibold">Card Text</label>
                    <textarea
                      className="w-full rounded border p-1 text-xs"
                      value={selectedNode.content.text || ""}
                      onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { text: e.target.value } })}
                    />
                  </>
                )}
                <label className="text-[10px]">Box opacity ({readColorOpacity(selectedNode.style.backgroundColor).toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                  value={readColorOpacity(selectedNode.style.backgroundColor)}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: buildBoxOpacityPatch(selectedNode.id, Number(e.target.value)) })}
                />
                <label className="text-[10px]">Background Color</label>
                <input
                  type="color"
                  className="h-8 w-full rounded border p-1"
                  value={readColorHex(selectedNode.style.backgroundColor, "#000000")}
                  onChange={(e) => dispatch({
                    type: "UPDATE_CARD",
                    nodeId: selectedNode.id,
                    patch: { backgroundColor: withColorOpacity(e.target.value, readColorOpacity(selectedNode.style.backgroundColor)) },
                  })}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
