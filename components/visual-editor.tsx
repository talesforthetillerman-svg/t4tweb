"use client"
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { MotionConfig } from "framer-motion"

type NodeType = "section" | "background" | "card" | "text" | "button" | "image"

type Point = { x: number; y: number }

type Size = { width: number; height: number }
type ConcertField = "date" | "venue" | "city" | "country" | "genre" | "price" | "status" | "time" | "capacity" | "locationUrl"

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

interface TextSegment {
  text: string
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  opacity: number
  fontSize?: string
  fontFamily?: string
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
    scale?: number
    minHeight?: string
    paddingTop?: string
    paddingBottom?: string
  }
  content: {
    text?: string
    textSegments?: TextSegment[]
    titleSegments?: TextSegment[]
    href?: string
    src?: string
    alt?: string
    videoUrl?: string
    mediaKind?: "image" | "video"
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
  | { type: "SET_NODE_GEOMETRY"; nodeId: string; x: number; y: number; width: number; height: number; transient?: boolean }
  | { type: "SET_NODE_SCALE"; nodeId: string; scale: number; transient?: boolean }
  | { type: "UPDATE_TEXT"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_BUTTON"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_IMAGE"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_CARD"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_BACKGROUND"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
  | { type: "UPDATE_SECTION"; nodeId: string; patch: Partial<EditorNode["content"] & EditorNode["style"]> }
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
}

const RELEASE_TRACE_IDS = new Set([
  "latest-release-section",
  "latest-release-bg",
  "latest-release-card",
  "latest-release-title",
  "latest-release-subtitle",
  "latest-release-watch-button",
  "latest-release-shows-button",
])

function isReleaseTraceNode(nodeId: string | null | undefined): boolean {
  return !!nodeId && RELEASE_TRACE_IDS.has(nodeId)
}

function isEditingInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

function normalizeType(raw: string): NodeType {
  if (raw === "link") return "button"
  if (raw === "box") return "card"
  if (raw === "section" || raw === "background" || raw === "card" || raw === "text" || raw === "button" || raw === "image") {
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

function getConcertFieldFromNodeContent(node: EditorNode | null, field: ConcertField): string {
  if (!node) return ""
  const value = node.content[field as keyof EditorNode["content"]]
  return typeof value === "string" ? value : ""
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

function buildBoxOpacityPatch(nodeId: string, opacity: number): Partial<EditorNode["style"]> {
  if (typeof document === "undefined") return { opacity }
  const el = document.querySelector<HTMLElement>(`[data-editor-node-id="${nodeId}"]`)
  const computed = el ? getComputedStyle(el).backgroundColor : undefined
  const current = computed && computed !== "rgba(0, 0, 0, 0)" ? computed : undefined
  if (!current) return { opacity }
  return { backgroundColor: withColorOpacity(current, opacity), opacity }
}

function isPersistableImageSrc(value: string | undefined): boolean {
  if (!value) return false
  const src = value.trim()
  if (!src) return false
  if (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("javascript:")) return false
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")
}

const VisualEditorContext = createContext<VisualEditorContextType>({
  isEditing: false,
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
    const visible = style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity || "1") > 0
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
    if (entry.id === "hero-title") {
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
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim()
          if (!text) return
          segments.push({ ...baseSegment, text })
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
  if (entry.type === "button") {
    content.href = el.getAttribute("href") || ""
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
      content.videoUrl = iframe?.getAttribute("src") || ""
    }
  }
  const cs = getComputedStyle(el)
  const explicitContent = hydrated?.explicitContent ?? (el.dataset.editorExplicitContent === "true")
  const explicitStyle = hydrated?.explicitStyle ?? (el.dataset.editorExplicitStyle === "true")
  const explicitPosition = hydrated?.explicitPosition ?? (el.dataset.editorExplicitPosition === "true")
  const explicitSize = hydrated?.explicitSize ?? (el.dataset.editorExplicitSize === "true")
  const geometryX = parseDatasetNumber(el.dataset.editorGeometryX)
  const geometryY = parseDatasetNumber(el.dataset.editorGeometryY)
  const geometryWidth = parseDatasetNumber(el.dataset.editorGeometryWidth)
  const geometryHeight = parseDatasetNumber(el.dataset.editorGeometryHeight)
  const hydratedGeometry = hydrated?.geometry || null
  const hydratedStyle = hydrated?.style || null
  const hydratedContent = hydrated?.content || null

  return {
    id: entry.id,
    type: entry.type,
    sectionId: entry.sectionId,
    label: entry.label,
    isGrouped: entry.isGrouped,
    geometry: {
      x: (typeof hydratedGeometry?.x === "number" ? hydratedGeometry.x : null) ?? geometryX ?? 0,
      y: (typeof hydratedGeometry?.y === "number" ? hydratedGeometry.y : null) ?? geometryY ?? 0,
      width: (typeof hydratedGeometry?.width === "number" ? hydratedGeometry.width : null) ?? geometryWidth ?? entry.rect.width,
      height: (typeof hydratedGeometry?.height === "number" ? hydratedGeometry.height : null) ?? geometryHeight ?? entry.rect.height,
    },
    style: {
      color: rgbToHex(cs.color),
      backgroundColor: cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? rgbToHex(cs.backgroundColor) : undefined,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textDecoration: cs.textDecorationLine,
      scale: 1,
      minHeight: cs.minHeight,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      ...(hydratedStyle || {}),
    },
    content,
    explicitContent: false,
    explicitStyle: false,
    explicitPosition: false,
    explicitSize: false,
  }
}

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false)
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
    const params = new URLSearchParams(window.location.search)
    if (params.get("editMode") === "true" || window.location.pathname === "/editor") {
      setIsEditing(true)
    }
  }, [])

  useEffect(() => {
    if (!isEditing) return
    refreshRegistry()
    const nextNodes = new Map<string, EditorNode>()
    scanRegistry().forEach((entry, id) => {
      nextNodes.set(id, buildNodeFromEntry(entry))
    })
    setNodes(nextNodes)
    snapshot(nextNodes)
  }, [isEditing, snapshot, refreshRegistry])

  const applyNodeToDom = useCallback((node: EditorNode, entry: RuntimeEntry) => {
    const el = entry.element
    const g = node.geometry
    const hasManagedTransform = el.dataset.editorManagedTransform === "true"
    const hasManagedSize = el.dataset.editorManagedSize === "true"
    const nodeScale = Math.max(0.1, node.style.scale ?? 1)
    if (node.explicitPosition || (node.explicitStyle && nodeScale !== 1)) {
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
    if (node.explicitSize) {
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

    if (node.explicitStyle && node.style.opacity !== undefined) el.style.opacity = String(node.style.opacity)
    if (node.type === "text" || node.type === "button") {
      if (node.explicitContent) {
        if (node.id === "hero-title" && Array.isArray(node.content.textSegments) && node.content.textSegments.length > 0) {
          el.innerHTML = ""
          node.content.textSegments.forEach((segment) => {
            const span = document.createElement("span")
            span.textContent = segment.text
            span.style.color = segment.color
            span.style.fontWeight = segment.bold ? "700" : "400"
            span.style.fontStyle = segment.italic ? "italic" : "normal"
            span.style.textDecoration = segment.underline ? "underline" : "none"
            span.style.opacity = String(segment.opacity)
            if (segment.fontSize) span.style.fontSize = segment.fontSize
            if (segment.fontFamily) span.style.fontFamily = segment.fontFamily
            span.style.marginRight = "0.25em"
            el.appendChild(span)
          })
        } else if (node.content.text !== undefined) {
          el.textContent = node.content.text
        }
      }
      if (node.explicitStyle) {
        if (node.style.color) el.style.color = node.style.color
        if (node.style.fontSize) el.style.fontSize = node.style.fontSize
        if (node.style.fontFamily) el.style.fontFamily = node.style.fontFamily
        if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight
        if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle
        if (node.style.textDecoration) el.style.textDecoration = node.style.textDecoration
      }
    }
    if (node.type === "button") {
      if (node.explicitContent && node.content.href !== undefined && (el.tagName === "A" || el.tagName === "BUTTON")) {
        el.setAttribute("href", node.content.href)
      }
      if (node.explicitStyle && node.style.backgroundColor) el.style.backgroundColor = node.style.backgroundColor
    }
    if (node.type === "card") {
      if (node.explicitContent && node.content.text !== undefined) el.textContent = node.content.text
      if (node.explicitStyle && node.style.backgroundColor) el.style.backgroundColor = node.style.backgroundColor
    }
    if (node.type === "image" || node.type === "background") {
      const img = el.tagName === "IMG" ? (el as HTMLImageElement) : el.querySelector("img")
      const iframe = node.type === "background" ? el.querySelector("iframe") : null
      if (node.explicitContent) {
        if (node.type === "background" && node.content.mediaKind === "video") {
          if (iframe && node.content.videoUrl) iframe.setAttribute("src", node.content.videoUrl)
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
        if (node.style.minHeight) el.style.minHeight = node.style.minHeight
        if (node.style.paddingTop) el.style.paddingTop = node.style.paddingTop
        if (node.style.paddingBottom) el.style.paddingBottom = node.style.paddingBottom
      }
    }
  }, [])

  useEffect(() => {
    if (!isEditing) return
    nodes.forEach((node, id) => {
      const entry = registry.get(id)
      if (!entry) return
      applyNodeToDom(node, entry)
    })
  }, [nodes, registry, isEditing, applyNodeToDom])

  const dispatch = useCallback((command: Command) => {
    setNodes((prev) => {
      const next = new Map(prev)
      const patchNode = (nodeId: string, updater: (node: EditorNode) => EditorNode) => {
        const node = next.get(nodeId)
        if (!node) return
        const updated = updater(node)
        if (updated === node) return
        next.set(nodeId, updated)
        if (isReleaseTraceNode(nodeId)) {
          console.info("[RELEASE-TRACE][dispatch][patchNode]", {
            nodeId,
            before: {
              geometry: node.geometry,
              explicitContent: node.explicitContent,
              explicitStyle: node.explicitStyle,
              explicitPosition: node.explicitPosition,
              explicitSize: node.explicitSize,
            },
            after: {
              geometry: updated.geometry,
              explicitContent: updated.explicitContent,
              explicitStyle: updated.explicitStyle,
              explicitPosition: updated.explicitPosition,
              explicitSize: updated.explicitSize,
            },
          })
        }
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
          shouldSnapshot = !command.transient && !transactionRef.current.active
          break
        case "RESIZE_NODE":
          patchNode(command.nodeId, (n) => ({ ...n, explicitSize: true, geometry: { ...n.geometry, width: command.width, height: command.height } }))
          shouldSnapshot = !command.transient && !transactionRef.current.active
          break
        case "SET_NODE_GEOMETRY":
          patchNode(command.nodeId, (n) => ({
            ...n,
            explicitPosition: true,
            explicitSize: true,
            geometry: { ...n.geometry, x: command.x, y: command.y, width: command.width, height: command.height },
          }))
          shouldSnapshot = !command.transient && !transactionRef.current.active
          break
        case "SET_NODE_SCALE":
          patchNode(command.nodeId, (n) => ({
            ...n,
            explicitStyle: true,
            style: { ...n.style, scale: Math.max(0.1, command.scale) },
          }))
          shouldSnapshot = !command.transient && !transactionRef.current.active
          break
        case "UPDATE_TEXT":
        case "UPDATE_BUTTON":
        case "UPDATE_IMAGE":
        case "UPDATE_CARD":
        case "UPDATE_BACKGROUND":
        case "UPDATE_SECTION": {
          patchNode(command.nodeId, (n) => {
            const content: EditorNode["content"] = { ...n.content }
            const style = { ...n.style }
            let isContentEdit = !!n.explicitContent
            let isStyleEdit = !!n.explicitStyle
            Object.entries(command.patch).forEach(([k, v]) => {
              if (["text", "textSegments", "titleSegments", "href", "src", "alt", "videoUrl"].includes(k)) {
                isContentEdit = true;
                (content as Record<string, unknown>)[k] = v
              }
              else {
                isStyleEdit = true;
                (style as Record<string, unknown>)[k] = v
              }
            })
            return { ...n, content, style, explicitContent: isContentEdit, explicitStyle: isStyleEdit }
          })
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

    for (const candidate of els) {
      if (!(candidate instanceof HTMLElement)) continue
      if (candidate.closest("[data-editor-toolbar]") || candidate.closest("[data-editor-panel]")) continue

      // Concert card editing always wins over parent grouped lists and generic card handlers.
      const concertCard = candidate.closest<HTMLElement>("[data-concert-card='true'][data-editor-node-id]")
      if (concertCard?.dataset.editorNodeId) {
        const concertEntry = registry.get(concertCard.dataset.editorNodeId)
        if (concertEntry?.eligible) return concertEntry
      }

      const bound = candidate.closest<HTMLElement>("[data-editor-node-id]")
      if (!bound?.dataset.editorNodeId) continue
      const entry = registry.get(bound.dataset.editorNodeId)
      if (!entry || !entry.eligible) continue
      if (!candidates.find((c) => c.id === entry.id)) candidates.push(entry)
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

    candidates.sort((a, b) => typePriority[a.type] - typePriority[b.type])

    const best = candidates[0]
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
  }, [isEditing, registry, refreshRegistry])

  useEffect(() => {
    if (!isEditing) return
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
        next.delete(id)
        changed = true
      }

      return changed ? next : prev
    })
  }, [isEditing, registry])

  const value: VisualEditorContextType = {
    isEditing,
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
      </MotionConfig>
    </VisualEditorContext.Provider>
  )
}

function SelectionOverlay({ entry }: { entry: RuntimeEntry }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const isSection = entry.type === "section"

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
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncOnce)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [entry])

  return createPortal(
    <div data-editor-overlay className="fixed inset-0 pointer-events-none z-[9990]">
      <div
        ref={boxRef}
        className={`absolute border-2 ${
          isSection
            ? "border-[#22c55e] shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_0_12px_rgba(34,197,94,0.2)]"
            : "border-[#FF8C21] shadow-[0_0_0_1px_rgba(255,140,33,0.3),0_0_12px_rgba(255,140,33,0.15)]"
        }`}
      >
        {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => (
          <div
            key={handle}
            data-editor-resize-handle={handle}
            data-editor-resize-node-id={entry.id}
            className={`absolute h-3 w-3 rounded-sm border border-white bg-[#FF8C21] shadow ${
              handle === "nw" ? "-left-2 -top-2 cursor-nwse-resize" :
              handle === "n" ? "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize" :
              handle === "ne" ? "-right-2 -top-2 cursor-nesw-resize" :
              handle === "e" ? "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" :
              handle === "se" ? "-bottom-2 -right-2 cursor-nwse-resize" :
              handle === "s" ? "bottom-[-0.5rem] left-1/2 -translate-x-1/2 cursor-ns-resize" :
              handle === "sw" ? "-bottom-2 -left-2 cursor-nesw-resize" :
              "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize"
            }`}
            style={{ pointerEvents: "auto" }}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}

export function VisualEditorOverlay() {
  const { isEditing, setIsEditing, selectedId, nodes, registry, dispatch, openPanel, setOpenPanel, undo, redo, canUndo, canRedo, assets, getEditableAtPosition } = useVisualEditor()
  const [deployStatus, setDeployStatus] = useState<string | null>(null)
  const [deployDetails, setDeployDetails] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedIdsRef = useRef<string[]>([])
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const marqueeRef = useRef<{ active: boolean; start: Point }>({ active: false, start: { x: 0, y: 0 } })

  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  useEffect(() => {
    if (selectedId) setSelectedIds([selectedId])
    else setSelectedIds([])
  }, [selectedId])

  const selectedEntry = selectedId ? registry.get(selectedId) || null : null
  const selectedNode = selectedId ? nodes.get(selectedId) || null : null
  const heroTitleSegments = selectedNode?.id === "hero-title"
    ? (selectedNode.content.titleSegments || selectedNode.content.textSegments || [])
    : []
  const selectedBandMemberIndex = selectedNode?.id.startsWith("member-item-")
    ? Number(selectedNode.id.replace("member-item-", ""))
    : null

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
      return
    }
    if (field === "name") {
      document.querySelectorAll<HTMLElement>(`[data-member-name-index="${index}"],[data-member-overlay-name-index="${index}"]`).forEach((el) => {
        el.textContent = value
      })
      return
    }
    if (field === "role") {
      document.querySelectorAll<HTMLElement>(`[data-member-role-index="${index}"],[data-member-overlay-role-index="${index}"]`).forEach((el) => {
        el.textContent = value
      })
      return
    }
    document.querySelectorAll<HTMLImageElement>(`[data-member-photo-index="${index}"]`).forEach((img) => {
      img.src = value
    })
  }, [])
  const exitEditor = () => {
    setIsEditing(false)
    window.location.reload()
  }

  const onDeploy = async () => {
    setDeployStatus("connecting")
    try {
      const payload = {
        level: "green" as const,
        findings: [],
        nodes: Array.from(nodes.values()).map((node) => ({
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
        })),
      }
      const response = await fetch("/api/editor-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as {
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
      }
      const envDiagnostics = data.envDiagnostics || data.diagnostics

      console.info("[editor-deploy] raw response", {
        endpoint: "/api/editor-deploy",
        statusCode: response.status,
        ok: response.ok,
        body: data,
      })

      const lines: string[] = ["connecting"]
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        data.steps.forEach((item) => {
          lines.push(item.step)
          setDeployStatus(item.step)
        })
      } else if (data.step) {
        lines.push(data.step)
        setDeployStatus(data.step)
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

      if (data.step === "done" || lines.includes("revalidating")) {
        setDeployStatus("done")
        if (!lines.includes("done")) lines.push("done")
      }
      lines.push(`routeVersion: ${data.routeVersion || "missing"}`)
      lines.push(`step: ${data.step || "missing"}`)
      lines.push(`message: ${data.message || "missing"}`)
      lines.push(`envDiagnostics: ${JSON.stringify(envDiagnostics || null)}`)
      lines.push(`rawResponse: ${JSON.stringify(data)}`)
      setDeployDetails(lines.join("\n"))
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
    handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null
    nodeId: string | null
    lastGeometry: NodeGeometry | null
  }>({ mode: null, start: { x: 0, y: 0 }, origin: null, handle: null, nodeId: null, lastGeometry: null })
  const pointerScaleRef = useRef<{ origin: number; last: number }>({ origin: 1, last: 1 })
  const createPointerState = (
    partial: Partial<typeof pointerRef.current>
  ): typeof pointerRef.current => ({
    mode: partial.mode ?? null,
    start: partial.start ?? { x: 0, y: 0 },
    origin: partial.origin ?? null,
    handle: partial.handle ?? null,
    nodeId: partial.nodeId ?? null,
    lastGeometry: partial.lastGeometry ?? null,
  })

  useEffect(() => {
    if (!isEditing) return
    document.body.setAttribute("data-editor-mode", "true")

    const onPointerDown = (e: PointerEvent) => {
      const multiModifier = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const resizeHandleTarget = target.closest<HTMLElement>("[data-editor-resize-handle]")
      if (resizeHandleTarget instanceof HTMLElement) {
        e.preventDefault()
        e.stopPropagation()
        const handle = (resizeHandleTarget.dataset.editorResizeHandle || null) as "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null
        const resizeNodeId = resizeHandleTarget.dataset.editorResizeNodeId || selectedId
        if (!resizeNodeId) return
        const n = nodes.get(resizeNodeId)
        if (!n || !handle) return
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
        dispatch({ type: "BEGIN_TRANSACTION" })
        const n = nodes.get(hit.id)
        pointerScaleRef.current = { origin: n?.style.scale ?? 1, last: n?.style.scale ?? 1 }
        pointerRef.current = createPointerState({
          mode: "move",
          start: { x: e.clientX, y: e.clientY },
          origin: n ? { ...n.geometry } : null,
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
      const state = pointerRef.current
      if (!state.mode || !state.origin || !state.nodeId) return
      const dx = e.clientX - state.start.x
      const dy = e.clientY - state.start.y
      if (state.mode === "move") {
        dispatch({ type: "MOVE_NODE", nodeId: state.nodeId, dx, dy, transient: true })
        pointerRef.current.start = { x: e.clientX, y: e.clientY }
      } else if (state.mode === "resize" && state.origin && state.nodeId && state.handle) {
        const handle = state.handle
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

        if (handle.length === 2) {
          const scale = Math.max(nextWidth / Math.max(1, state.origin.width), nextHeight / Math.max(1, state.origin.height))
          const safeScale = Math.max(0.2, scale * pointerScaleRef.current.origin)
          nextWidth = state.origin.width
          nextHeight = state.origin.height
          if (handle.includes("w")) nextX = state.origin.x + (state.origin.width - nextWidth)
          if (handle.includes("n")) nextY = state.origin.y + (state.origin.height - nextHeight)
          pointerScaleRef.current.last = safeScale
          dispatch({ type: "SET_NODE_SCALE", nodeId: state.nodeId, scale: safeScale, transient: true })
          const geometry: NodeGeometry = { x: nextX, y: nextY, width: nextWidth, height: nextHeight }
          pointerRef.current.lastGeometry = geometry
          dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, ...geometry, transient: true })
          return
        }

        nextWidth = Math.max(8, nextWidth)
        nextHeight = Math.max(8, nextHeight)

        const geometry: NodeGeometry = { x: nextX, y: nextY, width: nextWidth, height: nextHeight }
        pointerRef.current.lastGeometry = geometry
        dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, ...geometry, transient: true })
      }
    }

    const onPointerUp = () => {
      const state = pointerRef.current
      if (state.mode === "resize" && state.nodeId && state.lastGeometry) {
        const g = state.lastGeometry
        dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, x: g.x, y: g.y, width: g.width, height: g.height })
        dispatch({ type: "SET_NODE_SCALE", nodeId: state.nodeId, scale: pointerScaleRef.current.last })
      }
      pointerRef.current.mode = null
      pointerRef.current.origin = null
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
  }, [isEditing, dispatch, selectedId, selectedIds, undo, redo, getEditableAtPosition, marqueeRect, registry])

  if (!isEditing) {
    return null
  }

  const deployStatusColor =
    deployStatus === "success" ? "text-emerald-300" :
    deployStatus === "partial" ? "text-amber-300" :
    deployStatus === "failed" ? "text-red-300" :
    "text-slate-300"
  const deployStatusTitle =
    deployStatus === "success" ? "Success" :
    deployStatus === "partial" ? "Partial" :
    deployStatus === "failed" ? "Error / Failed" :
    "Saving..."
  const deployStatusMessage =
    deployStatus === "success" ? "All changes were saved and propagated." :
    deployStatus === "partial" ? "Some changes were saved, but propagation is incomplete." :
    deployStatus === "failed" ? "Save/deploy failed. Review technical details." :
    "Deploy is currently running."

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

      {deployDetails && (
        <div data-editor-deploy-modal className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl rounded-lg border border-white/20 bg-[#111827] p-4 text-slate-100 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Deploy result</h3>
              <button
                type="button"
                onClick={() => { setDeployDetails(null); setCopyState("idle") }}
                className="rounded border border-white/30 px-2 py-1 text-xs text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded border border-white/15 bg-black/35 p-3 text-xs text-slate-100 select-text">{deployDetails}</pre>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={onCopyDeployDetails} className="rounded border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10">
                Copy details
              </button>
              {copyState === "copied" && <span className="text-xs text-emerald-300">Copied</span>}
              {copyState === "failed" && <span className="text-xs text-red-300">Copy failed</span>}
            </div>
          </div>
        </div>
      )}

      {selectedEntry && <SelectionOverlay entry={selectedEntry} />}

      {openPanel && selectedNode && (
        <div data-editor-panel className="fixed top-16 right-3 z-[9997] w-72 rounded-xl bg-white text-slate-900 shadow-2xl">
          <div className="bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-3 py-2 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{selectedNode.label}</div>
                <div className="text-[10px] capitalize">{selectedNode.type}</div>
              </div>
              <button onClick={() => { dispatch({ type: "DESELECT_NODE" }); setOpenPanel(false) }}>×</button>
            </div>
          </div>

          <div className="space-y-2 p-3 text-slate-900">
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
                    updateBandMemberField(selectedBandMemberIndex, "photo", url)
                  }}
                />
              </div>
            )}

            {selectedNode.type === "text" && selectedNode.id === "hero-title" && heroTitleSegments.length > 0 && (
              <>
                <label className="text-xs font-semibold">Hero Title Segments</label>
                <div className="rounded border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-900">
                  heroTitleInspectorMode: segmented{"\n"}
                  selectedNode.id: {selectedNode.id}{"\n"}
                  hasTitleSegments: yes{"\n"}
                  segmentCount: {heroTitleSegments.length}
                </div>
                <div className="space-y-2">
                  {heroTitleSegments.map((segment, index) => (
                    <div key={`hero-segment-editor-${index}`} className="rounded border border-slate-200 p-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Segment {index + 1}</div>
                      <input
                        className="mb-2 w-full rounded border p-1 text-xs"
                        value={segment.text}
                          onChange={(e) => {
                          const next = [...heroTitleSegments]
                          next[index] = { ...next[index], text: e.target.value }
                          dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next, text: next.map((s) => s.text).join(" ").trim() } })
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="color"
                          className="h-8 w-full rounded border p-1"
                          value={segment.color || "#ffffff"}
                          onChange={(e) => {
                            const next = [...heroTitleSegments]
                            next[index] = { ...next[index], color: e.target.value }
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next } })
                          }}
                        />
                        <div>
                          <label className="text-[10px]">Opacity ({(segment.opacity ?? 1).toFixed(2)})</label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full"
                            value={segment.opacity ?? 1}
                            onChange={(e) => {
                              const next = [...heroTitleSegments]
                              next[index] = { ...next[index], opacity: Number(e.target.value) }
                              dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next } })
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`rounded border px-2 py-1 text-xs ${segment.bold ? "bg-slate-900 text-white" : ""}`}
                          onClick={() => {
                            const next = [...heroTitleSegments]
                            next[index] = { ...next[index], bold: !segment.bold }
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next } })
                          }}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          className={`rounded border px-2 py-1 text-xs ${segment.italic ? "bg-slate-900 text-white" : ""}`}
                          onClick={() => {
                            const next = [...heroTitleSegments]
                            next[index] = { ...next[index], italic: !segment.italic }
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next } })
                          }}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          className={`rounded border px-2 py-1 text-xs ${segment.underline ? "bg-slate-900 text-white" : ""}`}
                          onClick={() => {
                            const next = [...heroTitleSegments]
                            next[index] = { ...next[index], underline: !segment.underline }
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next } })
                          }}
                        >
                          U
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => {
                            const next = heroTitleSegments.filter((_, i) => i !== index)
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next, text: next.map((s) => s.text).join(" ").trim() } })
                          }}
                        >
                          Delete phrase
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs"
                          disabled={index === 0}
                          onClick={() => {
                            if (index === 0) return
                            const next = [...heroTitleSegments]
                            const temp = next[index - 1]
                            next[index - 1] = next[index]
                            next[index] = temp
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next } })
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs"
                          disabled={index === heroTitleSegments.length - 1}
                          onClick={() => {
                            const next = [...heroTitleSegments]
                            if (index >= next.length - 1) return
                            const temp = next[index + 1]
                            next[index + 1] = next[index]
                            next[index] = temp
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next } })
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => {
                      const next = [...heroTitleSegments, { text: "New phrase", color: "#ffffff", bold: true, italic: false, underline: false, opacity: 1 }]
                      dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { titleSegments: next, textSegments: next, text: next.map((s) => s.text).join(" ").trim() } })
                    }}
                  >
                    Add phrase
                  </button>
                </div>
              </>
            )}

            {(selectedNode.type === "text" || selectedNode.type === "button") && !(selectedNode.type === "text" && selectedNode.id === "hero-title" && heroTitleSegments.length > 0) && (
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
                  <label className="text-[10px]">Opacity ({(selectedNode.style.opacity ?? 1).toFixed(2)})</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                    value={selectedNode.style.opacity ?? 1}
                    onChange={(e) => dispatch({ type: selectedNode.type === "text" ? "UPDATE_TEXT" : "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { opacity: Number(e.target.value) } })}
                  />
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
                </div>
              </>
            )}

            {selectedNode.type === "button" && (
              <>
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
                <label className="text-xs font-semibold">Link</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.content.href || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { href: e.target.value } })}
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
                    patch: { src: e.target.value, mediaKind: "image" },
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
                    const url = URL.createObjectURL(file)
                    dispatch({
                      type: selectedNode.type === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
                      nodeId: selectedNode.id,
                      patch: { src: url, mediaKind: "image" },
                    })
                  }}
                />
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
                  <label className="text-[10px]">Opacity ({(selectedNode.style.opacity ?? 1).toFixed(2)})</label>
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
                <label className="text-xs font-semibold">Video Link</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.content.videoUrl || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_BACKGROUND", nodeId: selectedNode.id, patch: { videoUrl: e.target.value, mediaKind: "video" } })}
                />
              </>
            )}

            {/* Keep this block structurally flat to avoid JSX tag mismatch regressions in CI. */}
            {(selectedNode.type === "text" || selectedNode.type === "button") && (
              <div className="pt-1">
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600">Advanced Size</summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px]">Width</label>
                      <input
                        type="number"
                        className="w-full rounded border p-1 text-xs"
                        value={Math.round(selectedNode.geometry.width)}
                        onChange={(e) => dispatch({ type: "RESIZE_NODE", nodeId: selectedNode.id, width: Number(e.target.value) || selectedNode.geometry.width, height: selectedNode.geometry.height, transient: true })}
                        onBlur={(e) => dispatch({ type: "RESIZE_NODE", nodeId: selectedNode.id, width: Number(e.target.value) || selectedNode.geometry.width, height: selectedNode.geometry.height })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px]">Height</label>
                      <input
                        type="number"
                        className="w-full rounded border p-1 text-xs"
                        value={Math.round(selectedNode.geometry.height)}
                        onChange={(e) => dispatch({ type: "RESIZE_NODE", nodeId: selectedNode.id, width: selectedNode.geometry.width, height: Number(e.target.value) || selectedNode.geometry.height, transient: true })}
                        onBlur={(e) => dispatch({ type: "RESIZE_NODE", nodeId: selectedNode.id, width: selectedNode.geometry.width, height: Number(e.target.value) || selectedNode.geometry.height })}
                      />
                    </div>
                  </div>
                </details>
              </div>
            )}

            {selectedNode.type === "section" && (
              <>
                {selectedNode.id === "navigation" && (
                  <>
                    <label className="text-xs font-semibold">Scrolled background opacity ({(selectedNode.style.opacity ?? 0.8).toFixed(2)})</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full"
                      value={selectedNode.style.opacity ?? 0.8}
                      onChange={(e) => dispatch({ type: "UPDATE_SECTION", nodeId: selectedNode.id, patch: { opacity: Number(e.target.value) } })}
                    />
                  </>
                )}
                <label className="text-xs font-semibold">Min Height</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.style.minHeight || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_SECTION", nodeId: selectedNode.id, patch: { minHeight: e.target.value } })}
                />
                <label className="text-xs font-semibold">Padding Top</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.style.paddingTop || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_SECTION", nodeId: selectedNode.id, patch: { paddingTop: e.target.value } })}
                />
                <label className="text-xs font-semibold">Padding Bottom</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.style.paddingBottom || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_SECTION", nodeId: selectedNode.id, patch: { paddingBottom: e.target.value } })}
                />
              </>
            )}

            {selectedNode.type === "card" && (
              <>
                <label className="text-xs font-semibold">Card Text</label>
                <textarea
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.content.text || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { text: e.target.value } })}
                />
                <label className="text-[10px]">Opacity ({(selectedNode.style.opacity ?? 1).toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                  value={selectedNode.style.opacity ?? 1}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { opacity: Number(e.target.value) } })}
                />
                <label className="text-[10px]">Background Color</label>
                <input
                  type="color"
                  className="h-8 w-full rounded border p-1"
                  value={selectedNode.style.backgroundColor || "#000000"}
                  onChange={(e) => dispatch({ type: "UPDATE_CARD", nodeId: selectedNode.id, patch: { backgroundColor: e.target.value } })}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
