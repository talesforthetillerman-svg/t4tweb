"use client"
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { MotionConfig } from "framer-motion"
import {
  applyScrollIndicatorLayoutToElement,
  clearScrollIndicatorLayoutFromElement,
  roundLayoutPx,
} from "@/lib/hero-layout-styles"

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
    textAlign?: "left" | "center" | "right"
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
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
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
  | { type: "RESTORE_SNAPSHOT"; nodes: EditorNode[] }
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
          const fromData = childEl.dataset.editorGradientEnabled === "true"
          const gradientStart = childEl.dataset.editorGradientStart || childEl.dataset.gradientStart
          const gradientEnd = childEl.dataset.editorGradientEnd || childEl.dataset.gradientEnd
          const bgImage = childStyle.backgroundImage || ""
          const looksLikeGradient =
            fromData ||
            (bgImage.includes("gradient") && (childStyle.webkitBackgroundClip === "text" || childStyle.backgroundClip === "text"))
          segments.push({
            text: childText,
            color: rgbToHex(childStyle.color),
            bold: Number(childStyle.fontWeight || "400") >= 600,
            italic: childStyle.fontStyle === "italic",
            underline: (childStyle.textDecorationLine || "").includes("underline"),
            opacity: Number(childStyle.opacity || "1"),
            fontSize: childStyle.fontSize,
            fontFamily: childStyle.fontFamily,
            gradientEnabled: looksLikeGradient,
            gradientStart: gradientStart || "#FFB15A",
            gradientEnd: gradientEnd || "#FF6C00",
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
    content: {
      ...content,
      ...(hydratedContent || {}),
    },
    explicitContent,
    explicitStyle,
    explicitPosition,
    explicitSize,
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
    const nextRegistry = scanRegistry()
    setRegistry((prev) => (areRegistryMapsEquivalent(prev, nextRegistry) ? prev : nextRegistry))
    const nextNodes = new Map<string, EditorNode>()
    nextRegistry.forEach((entry, id) => {
      nextNodes.set(id, buildNodeFromEntry(entry))
    })
    setNodes(nextNodes)
    snapshot(nextNodes)
  }, [isEditing, snapshot])

  const applyNodeToDom = useCallback((node: EditorNode, entry: RuntimeEntry) => {
    const el = entry.element
    const g = node.geometry
    const hasManagedTransform = el.dataset.editorManagedTransform === "true"
    const hasManagedSize = el.dataset.editorManagedSize === "true"
    const nodeScale = Math.max(0.1, node.style.scale ?? 1)
    const gx = roundLayoutPx(g.x)
    const gy = roundLayoutPx(g.y)

    /** Scroll: same transform model as public page (`left: 50%` + `translate(calc(-50% + x), y)`). */
    if (node.id === "hero-scroll-indicator") {
      if (node.explicitPosition || node.explicitSize || (node.explicitStyle && nodeScale !== 1)) {
        applyScrollIndicatorLayoutToElement(el, { x: gx, y: gy, width: g.width, height: g.height }, nodeScale)
        el.dataset.editorManagedTransform = "true"
      } else {
        if (hasManagedTransform) {
          clearScrollIndicatorLayoutFromElement(el)
          delete el.dataset.editorManagedTransform
        }
        if (hasManagedSize) {
          el.style.removeProperty("width")
          el.style.removeProperty("height")
          delete el.dataset.editorManagedSize
        }
      }
    } else if (node.explicitPosition || (node.explicitStyle && nodeScale !== 1)) {
      el.style.transform = nodeScale !== 1
        ? `translate(${gx}px, ${gy}px) scale(${nodeScale})`
        : `translate(${gx}px, ${gy}px)`
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
      el.style.width = `${Math.max(8, roundLayoutPx(g.width))}px`
      el.style.height = `${Math.max(8, roundLayoutPx(g.height))}px`
      el.dataset.editorManagedSize = "true"
    } else if (hasManagedSize) {
      el.style.removeProperty("width")
      el.style.removeProperty("height")
      delete el.dataset.editorManagedSize
    }

    if (node.explicitStyle && node.style.opacity !== undefined) el.style.opacity = String(node.style.opacity)
    if (node.type === "text" || node.type === "button") {
      if (node.explicitContent) {
        if (node.id === "hero-title" && Array.isArray(node.content.textSegments) && node.content.textSegments.length > 0) {
          el.innerHTML = ""
          node.content.textSegments.forEach((segment, segIndex) => {
            const span = document.createElement("span")
            span.textContent = segment.text
            span.dataset.editorGradientEnabled = segment.gradientEnabled ? "true" : "false"
            if (segment.gradientStart) span.dataset.editorGradientStart = segment.gradientStart
            if (segment.gradientEnd) span.dataset.editorGradientEnd = segment.gradientEnd
            span.dataset.editorSegmentIndex = String(segIndex)
            if (segment.gradientEnabled) {
              span.style.background = `linear-gradient(90deg, ${segment.gradientStart || "#FFB15A"}, ${segment.gradientEnd || "#FF6C00"})`
              span.style.webkitBackgroundClip = "text"
              span.style.backgroundClip = "text"
              span.style.webkitTextFillColor = "transparent"
            } else {
              span.style.color = segment.color
            }
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
        if (node.content.gradientEnabled) {
          el.style.background = `linear-gradient(90deg, ${node.content.gradientStart || "#FFB15A"}, ${node.content.gradientEnd || "#FF6C00"})`
          el.style.webkitBackgroundClip = "text"
          el.style.backgroundClip = "text"
          el.style.webkitTextFillColor = "transparent"
          el.style.color = "transparent"
        } else {
          el.style.removeProperty("background")
          el.style.removeProperty("-webkit-background-clip")
          el.style.removeProperty("background-clip")
          el.style.removeProperty("-webkit-text-fill-color")
          if (node.style.color) el.style.color = node.style.color
        }
        if (node.style.fontSize) el.style.fontSize = node.style.fontSize
        if (node.style.fontFamily) el.style.fontFamily = node.style.fontFamily
        if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight
        if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle
        if (node.style.textDecoration) el.style.textDecoration = node.style.textDecoration
        if (node.style.textAlign) el.style.textAlign = node.style.textAlign
      }
    }
    if (node.type === "button") {
      if (node.explicitContent && node.content.href !== undefined && (el.tagName === "A" || el.tagName === "BUTTON")) {
        el.setAttribute("href", node.content.href)
      }
      if (node.explicitStyle) {
        if (node.content.gradientEnabled) {
          el.style.background = `linear-gradient(135deg, ${node.content.gradientStart || "#111111"}, ${node.content.gradientEnd || "#000000"})`
        } else {
          el.style.removeProperty("background")
          if (node.style.backgroundColor) el.style.backgroundColor = node.style.backgroundColor
        }
      }
    }
    if (node.type === "card") {
      if (node.explicitContent && node.content.href !== undefined && (el.tagName === "A" || el.tagName === "BUTTON")) {
        el.setAttribute("href", node.content.href)
      }
      if (node.explicitContent && node.content.text !== undefined) el.textContent = node.content.text
      if (node.explicitContent) {
        if (node.content.date !== undefined) el.dataset.concertDate = node.content.date
        if (node.content.venue !== undefined) el.dataset.concertVenue = node.content.venue
        if (node.content.city !== undefined) el.dataset.concertCity = node.content.city
        if (node.content.country !== undefined) el.dataset.concertCountry = node.content.country
        if (node.content.genre !== undefined) el.dataset.concertGenre = node.content.genre
        if (node.content.price !== undefined) el.dataset.concertPrice = node.content.price
        if (node.content.status !== undefined) el.dataset.concertStatus = node.content.status
        if (node.content.time !== undefined) el.dataset.concertTime = node.content.time
        if (node.content.capacity !== undefined) el.dataset.concertCapacity = node.content.capacity
        if (node.content.locationUrl !== undefined) el.dataset.concertLocationUrl = node.content.locationUrl

        const dateEl = el.querySelector<HTMLElement>('[data-concert-field="date"]')
        const venueEl = el.querySelector<HTMLElement>('[data-concert-field="venue"]')
        const locationEl = el.querySelector<HTMLElement>('[data-concert-field="location"]')
        const genreEl = el.querySelector<HTMLElement>('[data-concert-field="genre"]')
        const priceEl = el.querySelector<HTMLElement>('[data-concert-field="price"]')
        const timeEl = el.querySelector<HTMLElement>('[data-concert-field="time"]')
        if (dateEl && node.content.date !== undefined) {
          const parsed = new Date(node.content.date)
          dateEl.textContent = Number.isNaN(parsed.getTime())
            ? node.content.date
            : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        }
        if (venueEl && node.content.venue !== undefined) venueEl.textContent = node.content.venue
        if (locationEl && (node.content.city !== undefined || node.content.country !== undefined)) {
          locationEl.textContent = `${node.content.city || ""}, ${node.content.country || ""}`.replace(/^,\s*/, "").replace(/,\s*$/, "")
        }
        if (genreEl && node.content.genre !== undefined) genreEl.textContent = node.content.genre
        if (priceEl && node.content.price !== undefined) {
          const raw = node.content.price
          priceEl.textContent = raw === "Free" ? "Free" : raw ? `€${raw}` : ""
        }
        if (timeEl && node.content.time !== undefined) timeEl.textContent = node.content.time
      }
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

    if (isReleaseTraceNode(node.id)) {
      console.info("[RELEASE-TRACE][applyNodeToDom]", {
        id: node.id,
        geometry: node.geometry,
        explicitContent: node.explicitContent,
        explicitStyle: node.explicitStyle,
        explicitPosition: node.explicitPosition,
        explicitSize: node.explicitSize,
        domStyle: {
          transform: el.style.transform || null,
          opacity: el.style.opacity || null,
          width: el.style.width || null,
          height: el.style.height || null,
        },
      })
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
          if (command.dx === 0 && command.dy === 0) {
            shouldSnapshot = false
            break
          }
          patchNode(command.nodeId, (n) => ({ ...n, explicitPosition: true, geometry: { ...n.geometry, x: n.geometry.x + command.dx, y: n.geometry.y + command.dy } }))
          shouldSnapshot = !command.transient && !transactionRef.current.active
          break
        case "RESIZE_NODE":
          patchNode(command.nodeId, (n) => {
            if (n.geometry.width === command.width && n.geometry.height === command.height && n.explicitSize) return n
            return { ...n, explicitSize: true, geometry: { ...n.geometry, width: command.width, height: command.height } }
          })
          shouldSnapshot = !command.transient && !transactionRef.current.active
          break
        case "SET_NODE_GEOMETRY":
          patchNode(command.nodeId, (n) => {
            if (
              n.geometry.x === command.x &&
              n.geometry.y === command.y &&
              n.geometry.width === command.width &&
              n.geometry.height === command.height &&
              n.explicitPosition &&
              n.explicitSize
            ) return n
            return {
              ...n,
              explicitPosition: true,
              explicitSize: true,
              geometry: { ...n.geometry, x: command.x, y: command.y, width: command.width, height: command.height },
            }
          })
          shouldSnapshot = !command.transient && !transactionRef.current.active
          break
        case "SET_NODE_SCALE":
          patchNode(command.nodeId, (n) => {
            const nextScale = Math.max(0.1, command.scale)
            if ((n.style.scale ?? 1) === nextScale && n.explicitStyle) return n
            return {
              ...n,
              explicitStyle: true,
              style: { ...n.style, scale: nextScale },
            }
          })
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
              if ([
                "text",
                "textSegments",
                "titleSegments",
                "href",
                "src",
                "alt",
                "videoUrl",
                "gradientEnabled",
                "gradientStart",
                "gradientEnd",
                "date",
                "venue",
                "city",
                "country",
                "genre",
                "price",
                "status",
                "time",
                "capacity",
                "locationUrl",
              ].includes(k)) {
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

      const mapChanged = !areNodeMapsReferenceEqual(prev, next)
      if (!mapChanged) return prev
      if (shouldSnapshot && !transactionRef.current.active) snapshot(next)
      if (isReleaseTraceNode((command as { nodeId?: string }).nodeId)) {
        console.info("[RELEASE-TRACE][dispatch][command]", {
          type: command.type,
          nodeId: (command as { nodeId?: string }).nodeId || null,
          transient: (command as { transient?: boolean }).transient ?? null,
        })
      }
      return next
    })
  }, [registry, snapshot])

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
      const concertCardAncestor = best.element.closest<HTMLElement>("[data-concert-card='true'][data-editor-node-id]")
      if (concertCardAncestor?.dataset.editorNodeId) {
        const concertCardEntry = registry.get(concertCardAncestor.dataset.editorNodeId)
        if (concertCardEntry) return concertCardEntry
      }

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
        refreshRegistry()
        registryRafRef.current = null
      })
    }

    const mutationObserver = new MutationObserver((records) => {
      const shouldRefresh = records.some((record) => {
        if (record.type === "attributes") {
          return record.attributeName === "data-editor-node-id" || record.attributeName === "data-editor-deleted"
        }
        const touched = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)]
        return touched.some((node) => {
          if (!(node instanceof HTMLElement)) return false
          return !!node.matches?.("[data-editor-node-id]") || !!node.querySelector?.("[data-editor-node-id]")
        })
      })
      if (shouldRefresh) scheduleRegistryRefresh()
    })

    const rootResizeObserver = new ResizeObserver(() => {
      scheduleRegistryRefresh()
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-editor-node-id", "data-editor-deleted"],
    })
    rootResizeObserver.observe(document.documentElement)
    window.addEventListener("scroll", scheduleRegistryRefresh, true)
    window.addEventListener("resize", scheduleRegistryRefresh)

    return () => {
      mutationObserver.disconnect()
      rootResizeObserver.disconnect()
      window.removeEventListener("scroll", scheduleRegistryRefresh, true)
      window.removeEventListener("resize", scheduleRegistryRefresh)
      if (registryRafRef.current !== null) {
        window.cancelAnimationFrame(registryRafRef.current)
        registryRafRef.current = null
      }
    }
  }, [isEditing, refreshRegistry])

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
  const [assetUploadState, setAssetUploadState] = useState<Record<string, { status: "idle" | "uploading" | "uploaded" | "error"; message?: string }>>({})
  const nodesRef = useRef<Map<string, EditorNode>>(nodes)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const selectedEntry = selectedId ? registry.get(selectedId) || null : null
  const selectedNode = selectedId ? nodes.get(selectedId) || null : null
  const selectedImageSrcIsNonPersistable =
    !!selectedNode &&
    (selectedNode.type === "image" || selectedNode.type === "background") &&
    selectedNode.content.mediaKind !== "video" &&
    !!selectedNode.content.src &&
    !isPersistableImageSrc(selectedNode.content.src)
  const heroTitleSegments = selectedNode?.id === "hero-title"
    ? (selectedNode.content.titleSegments || selectedNode.content.textSegments || [])
    : []
  const selectedBandMemberMatch = selectedNode?.id?.match(/^member-item-(\d+)(?:-(name|role|number|image))?$/) || null
  const selectedBandMemberIndex = selectedBandMemberMatch ? Number(selectedBandMemberMatch[1]) : null
  const selectedIsBandMemberCard = selectedBandMemberIndex !== null
  const selectedConcertCardId = extractConcertCardId(selectedNode?.id)
  const [concertDraft, setConcertDraft] = useState<Record<ConcertField, string> | null>(null)

  const selectedIsLinkGroup = selectedNode?.id === "live-stream-platforms-group" || selectedNode?.id === "live-social-platforms-group"
  const selectedLinkGroupSummary = selectedIsLinkGroup
    ? document.querySelector<HTMLElement>(`[data-editor-node-id="${selectedNode.id}"]`)?.dataset.linkGroupSummary || ""
    : ""
  const selectedLinkGroupItems = selectedIsLinkGroup
    ? Array.from(document.querySelectorAll<HTMLAnchorElement>(`[data-editor-node-id="${selectedNode.id}"] [data-link-item="true"]`)).map((el) => ({
        id: el.dataset.editorNodeId || "",
        name: el.dataset.linkItemName || el.textContent?.trim() || "Unknown",
        href: el.href || "",
      }))
    : []

  const getBandMemberNodeId = useCallback((index: number, field: "number" | "name" | "role" | "photo"): string => {
    if (field === "photo") return `member-item-${index}-image`
    return `member-item-${index}-${field}`
  }, [])

  const getBandMemberNode = useCallback((index: number, field: "number" | "name" | "role" | "photo"): EditorNode | null => {
    const nodeId = getBandMemberNodeId(index, field)
    return nodes.get(nodeId) || null
  }, [getBandMemberNodeId, nodes])

  const getBandMemberFieldValue = useCallback((index: number, field: "number" | "name" | "role" | "photo"): string => {
    if (typeof document === "undefined") return ""
    if (field === "number") return document.querySelector<HTMLElement>(`[data-member-number-index="${index}"]`)?.textContent?.trim() || ""
    if (field === "name") return document.querySelector<HTMLElement>(`[data-member-name-index="${index}"]`)?.textContent?.trim() || ""
    if (field === "role") return document.querySelector<HTMLElement>(`[data-member-role-index="${index}"]`)?.textContent?.trim() || ""
    return getBandMemberNode(index, "photo")?.content.src || document.querySelector<HTMLImageElement>(`[data-member-photo-index="${index}"]`)?.src || ""
  }, [getBandMemberNode])

  const updateBandMemberCardStyle = useCallback((index: number, patch: Partial<EditorNode["content"] & EditorNode["style"]>) => {
    dispatch({
      type: "UPDATE_CARD",
      nodeId: `member-item-${index}`,
      patch,
    })
  }, [dispatch])

  const arrangeBandMemberCard = useCallback((index: number) => {
    const nodeId = `member-item-${index}`
    const node = nodesRef.current.get(nodeId)
    if (!node) return
    const dx = -node.geometry.x
    const dy = -node.geometry.y
    if (dx === 0 && dy === 0) return
    dispatch({ type: "MOVE_NODE", nodeId, dx, dy })
  }, [dispatch])

  const formatConcertDate = useCallback((value: string): string => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }, [])

  const getConcertCardFieldValue = useCallback((cardId: string, field: ConcertField): string => {
    const node = nodes.get(cardId) || null
    const contentValue = getConcertFieldFromNodeContent(node, field)
    if (contentValue) return contentValue
    if (typeof document === "undefined") return ""
    const card = document.querySelector<HTMLElement>(`[data-editor-node-id="${cardId}"]`)
    if (!card) return ""
    if (field === "date") return card.dataset.concertDate || ""
    if (field === "venue") return card.dataset.concertVenue || ""
    if (field === "city") return card.dataset.concertCity || ""
    if (field === "country") return card.dataset.concertCountry || ""
    if (field === "genre") return card.dataset.concertGenre || ""
    if (field === "price") return card.dataset.concertPrice || ""
    if (field === "status") return card.dataset.concertStatus || ""
    if (field === "time") return card.dataset.concertTime || ""
    if (field === "capacity") return card.dataset.concertCapacity || ""
    return card.dataset.concertLocationUrl || ""
  }, [nodes])

  const updateConcertCardField = useCallback((cardId: string, field: ConcertField, value: string) => {
    if (typeof document === "undefined") return
    const card = document.querySelector<HTMLElement>(`[data-editor-node-id="${cardId}"]`)
    if (!card) return

    if (field === "date") card.dataset.concertDate = value
    if (field === "venue") card.dataset.concertVenue = value
    if (field === "city") card.dataset.concertCity = value
    if (field === "country") card.dataset.concertCountry = value
    if (field === "genre") card.dataset.concertGenre = value
    if (field === "price") card.dataset.concertPrice = value
    if (field === "status") card.dataset.concertStatus = value
    if (field === "time") card.dataset.concertTime = value
    if (field === "capacity") card.dataset.concertCapacity = value
    if (field === "locationUrl") card.dataset.concertLocationUrl = value

    const dateEl = card.querySelector<HTMLElement>('[data-concert-field="date"]')
    const venueEl = card.querySelector<HTMLElement>('[data-concert-field="venue"]')
    const locationEl = card.querySelector<HTMLElement>('[data-concert-field="location"]')
    const genreEl = card.querySelector<HTMLElement>('[data-concert-field="genre"]')
    const priceEl = card.querySelector<HTMLElement>('[data-concert-field="price"]')
    const statusEl = card.querySelector<HTMLElement>('[data-concert-field="status"]')
    const timeEl = card.querySelector<HTMLElement>('[data-concert-field="time"]')
    const capacityEl = card.querySelector<HTMLElement>('[data-concert-field="capacity"]')

    if (dateEl) dateEl.textContent = formatConcertDate(card.dataset.concertDate || "")
    if (venueEl) venueEl.textContent = card.dataset.concertVenue || ""
    if (locationEl) locationEl.textContent = `${card.dataset.concertCity || ""}, ${card.dataset.concertCountry || ""}`.replace(/^,\s*/, "").replace(/,\s*$/, "")
    if (genreEl) genreEl.textContent = card.dataset.concertGenre || ""
    if (priceEl) {
      const raw = card.dataset.concertPrice || ""
      priceEl.textContent = raw === "Free" ? "Free" : raw ? `€${raw}` : ""
    }
    if (statusEl) statusEl.textContent = card.dataset.concertStatus || ""
    if (timeEl) timeEl.textContent = card.dataset.concertTime || ""
    if (capacityEl) capacityEl.textContent = card.dataset.concertCapacity || ""

    dispatch({
      type: "UPDATE_CARD",
      nodeId: cardId,
      patch: {
        date: card.dataset.concertDate || "",
        venue: card.dataset.concertVenue || "",
        city: card.dataset.concertCity || "",
        country: card.dataset.concertCountry || "",
        genre: card.dataset.concertGenre || "World Music",
        price: card.dataset.concertPrice || "",
        status: card.dataset.concertStatus || "",
        time: card.dataset.concertTime || "",
        capacity: card.dataset.concertCapacity || "",
        locationUrl: card.dataset.concertLocationUrl || "",
      },
    })

    window.dispatchEvent(new CustomEvent("editor-live-concert-update", {
      detail: { cardId, field, value },
    }))
  }, [dispatch, formatConcertDate])

  const updateLinkItemHref = useCallback((itemId: string, href: string) => {
    if (typeof document === "undefined") return
    const linkEl = document.querySelector<HTMLAnchorElement>(`[data-editor-node-id="${itemId}"]`)
    if (!linkEl) return
    linkEl.href = href
    dispatch({
      type: "UPDATE_CARD",
      nodeId: itemId,
      patch: { href },
    })
  }, [dispatch])

  useEffect(() => {
    if (!selectedConcertCardId) {
      setConcertDraft(null)
      return
    }
    setConcertDraft({
      date: getConcertCardFieldValue(selectedConcertCardId, "date"),
      venue: getConcertCardFieldValue(selectedConcertCardId, "venue"),
      city: getConcertCardFieldValue(selectedConcertCardId, "city"),
      country: getConcertCardFieldValue(selectedConcertCardId, "country"),
      genre: getConcertCardFieldValue(selectedConcertCardId, "genre"),
      price: getConcertCardFieldValue(selectedConcertCardId, "price"),
      status: getConcertCardFieldValue(selectedConcertCardId, "status"),
      time: getConcertCardFieldValue(selectedConcertCardId, "time"),
      capacity: getConcertCardFieldValue(selectedConcertCardId, "capacity"),
      locationUrl: getConcertCardFieldValue(selectedConcertCardId, "locationUrl"),
    })
  }, [selectedConcertCardId, getConcertCardFieldValue])

  const updateBandMemberField = useCallback((index: number, field: "number" | "name" | "role" | "photo", value: string) => {
    if (typeof document === "undefined") return
    const nameNodeId = `member-item-${index}-name`
    const roleNodeId = `member-item-${index}-role`
    const numberNodeId = `member-item-${index}-number`
    const imageNodeId = `member-item-${index}-image`
    if (field === "number") {
      const el = document.querySelector<HTMLElement>(`[data-member-number-index="${index}"]`)
      if (el) el.textContent = value
      dispatch({ type: "UPDATE_TEXT", nodeId: numberNodeId, patch: { text: value } })
      return
    }
    if (field === "name") {
      document.querySelectorAll<HTMLElement>(`[data-member-name-index="${index}"],[data-member-overlay-name-index="${index}"]`).forEach((el) => {
        el.textContent = value
      })
      dispatch({ type: "UPDATE_TEXT", nodeId: nameNodeId, patch: { text: value } })
      return
    }
    if (field === "role") {
      document.querySelectorAll<HTMLElement>(`[data-member-role-index="${index}"],[data-member-overlay-role-index="${index}"]`).forEach((el) => {
        el.textContent = value
      })
      dispatch({ type: "UPDATE_TEXT", nodeId: roleNodeId, patch: { text: value } })
      return
    }
    document.querySelectorAll<HTMLImageElement>(`[data-member-photo-index="${index}"]`).forEach((img) => {
      img.src = value
    })
    dispatch({ type: "UPDATE_IMAGE", nodeId: imageNodeId, patch: { src: value } })
  }, [dispatch])

  const updateBandMemberTextStyle = useCallback((index: number, field: "number" | "name" | "role", patch: Partial<EditorNode["content"] & EditorNode["style"]>) => {
    dispatch({
      type: "UPDATE_TEXT",
      nodeId: getBandMemberNodeId(index, field),
      patch,
    })
  }, [dispatch, getBandMemberNodeId])

  const updateBandMemberImageStyle = useCallback((index: number, patch: Partial<EditorNode["content"] & EditorNode["style"]>) => {
    dispatch({
      type: "UPDATE_IMAGE",
      nodeId: getBandMemberNodeId(index, "photo"),
      patch,
    })
  }, [dispatch, getBandMemberNodeId])

  const uploadEditorImageAsset = useCallback(async (nodeId: string, nodeType: "image" | "background", file: File) => {
    setAssetUploadState((prev) => ({ ...prev, [nodeId]: { status: "uploading", message: "Uploading to Sanity..." } }))
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/editor-upload-asset", {
        method: "POST",
        body: formData,
      })
      const data = (await response.json()) as { url?: string; message?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.message || "Upload failed")
      }

      dispatch({
        type: nodeType === "image" ? "UPDATE_IMAGE" : "UPDATE_BACKGROUND",
        nodeId,
        patch: { src: data.url, mediaKind: "image" },
      })
      setAssetUploadState((prev) => ({ ...prev, [nodeId]: { status: "uploaded", message: "Uploaded successfully." } }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed"
      setAssetUploadState((prev) => ({ ...prev, [nodeId]: { status: "error", message } }))
    }
  }, [dispatch])
  const exitEditor = () => {
    setIsEditing(false)
    window.location.reload()
  }

  const onDeploy = async () => {
    setDeployStatus("saving")
    setDeployDetails(null)
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
      const introIds = new Set([
        "intro-section",
        "intro-banner-gif",
        "intro-banner-text",
        "intro-book-button",
        "intro-press-button",
      ])
      const introPayloadNodes = payload.nodes.filter((node) => introIds.has(node.id))
      const releasePayloadNodes = payload.nodes.filter((node) => isReleaseTraceNode(node.id))
      console.info("[INTRO-TRACE][editor][onDeploy] posting /api/editor-deploy", {
        introNodeCount: introPayloadNodes.length,
        introNodes: introPayloadNodes.map((node) => ({
          id: node.id,
          geometry: node.geometry,
          content: node.content,
          style: node.style,
          explicitContent: node.explicitContent,
          explicitStyle: node.explicitStyle,
          explicitPosition: node.explicitPosition,
          explicitSize: node.explicitSize,
        })),
      })
      console.info("[RELEASE-TRACE][editor][onDeploy]", {
        releaseNodeCount: releasePayloadNodes.length,
        releaseNodes: releasePayloadNodes.map((node) => ({
          id: node.id,
          geometry: node.geometry,
          content: node.content,
          style: node.style,
          explicitContent: node.explicitContent,
          explicitStyle: node.explicitStyle,
          explicitPosition: node.explicitPosition,
          explicitSize: node.explicitSize,
        })),
      })
      const response = await fetch("/api/editor-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as {
        message?: string
        routeVersion?: string
        step?: string
        skippedNodes?: string[]
        failedNodes?: string[]
        persistedNodes?: string[]
        publicRevalidateAttempted?: boolean
        publicRevalidateOk?: boolean
        publicRevalidateMessage?: string
        publicRevalidateUrlConfigured?: boolean
        vercelDeployAttempted?: boolean
        vercelDeployOk?: boolean
        vercelDeployMessage?: string
        vercelDeployHookConfigured?: boolean
        publicPropagationConfigured?: boolean
        publicPropagationOk?: boolean
        steps?: Array<{ step: string; ok: boolean; message: string }>
      }

      const skippedCount = Array.isArray(data.skippedNodes) ? data.skippedNodes.length : 0
      const failedCount = Array.isArray(data.failedNodes) ? data.failedNodes.length : 0
      const persistedCount = Array.isArray(data.persistedNodes) ? data.persistedNodes.length : 0

      if (!response.ok) {
        console.info("[INTRO-TRACE][editor][onDeploy] response not ok", {
          status: response.status,
          data,
        })
        setDeployStatus("failed")
        setDeployDetails(JSON.stringify({
          message: data.message || "Changes not saved",
          step: data.step || "failed",
          skippedNodes: data.skippedNodes || [],
          failedNodes: data.failedNodes || [],
          routeVersion: data.routeVersion || "unknown",
        }, null, 2))
        return
      }

      if (failedCount > 0 || skippedCount > 0) {
        setDeployStatus("partial")
      } else {
        const publicPropagationOk = Boolean(data.publicRevalidateOk) || Boolean(data.vercelDeployOk)
        const publicPropagationConfigured = Boolean(data.publicRevalidateUrlConfigured) || Boolean(data.vercelDeployHookConfigured)
        if (publicPropagationConfigured && publicPropagationOk) {
          setDeployStatus("success")
        } else {
          setDeployStatus("partial")
        }
      }

      console.info("[INTRO-TRACE][editor][onDeploy] response ok", {
        status: response.status,
        data,
      })

      setDeployDetails(JSON.stringify({
        message: data.message || "Changes published",
        persistedNodes: persistedCount,
        skippedNodes: data.skippedNodes || [],
        failedNodes: data.failedNodes || [],
        publicRevalidate: {
          configured: data.publicRevalidateUrlConfigured ?? false,
          attempted: data.publicRevalidateAttempted ?? false,
          ok: data.publicRevalidateOk ?? false,
          message: data.publicRevalidateMessage ?? null,
        },
        vercelDeploy: {
          configured: data.vercelDeployHookConfigured ?? false,
          attempted: data.vercelDeployAttempted ?? false,
          ok: data.vercelDeployOk ?? false,
          message: data.vercelDeployMessage ?? null,
        },
        publicPropagation: {
          configured: data.publicPropagationConfigured ?? false,
          ok: data.publicPropagationOk ?? false,
        },
        routeVersion: data.routeVersion || "unknown",
      }, null, 2))
    } catch (error) {
      setDeployStatus("failed")
      const message = error instanceof Error ? error.message : "Unknown error"
      setDeployDetails(JSON.stringify({ message }, null, 2))
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
  const bodyOverflowRef = useRef<string | null>(null)
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
    if (!isEditing || !openPanel || !selectedNode) {
      if (bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current
        bodyOverflowRef.current = null
      }
      return
    }
    if (bodyOverflowRef.current === null) {
      bodyOverflowRef.current = document.body.style.overflow || ""
    }
    document.body.style.overflow = "hidden"
    return () => {
      if (bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current
        bodyOverflowRef.current = null
      }
    }
  }, [isEditing, openPanel, selectedNode])

  useEffect(() => {
    if (!isEditing) return
    document.body.setAttribute("data-editor-mode", "true")

    const onPointerDown = (e: PointerEvent) => {
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
        e.preventDefault()
        e.stopPropagation()
        dispatch({ type: "SELECT_NODE", nodeId: hit.id })
        dispatch({ type: "BEGIN_TRANSACTION" })
        const n = nodesRef.current.get(hit.id)
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
        dispatch({ type: "DESELECT_NODE" })
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const state = pointerRef.current
      if (!state.mode || !state.origin || !state.nodeId) return
      const dx = e.clientX - state.start.x
      const dy = e.clientY - state.start.y
      if (state.mode === "move") {
        if (isReleaseTraceNode(state.nodeId)) {
          const current = nodesRef.current.get(state.nodeId)
          console.info("[RELEASE-TRACE][pointer][move-transient]", {
            nodeId: state.nodeId,
            pointerDelta: { dx, dy },
            currentGeometry: current?.geometry || null,
          })
        }
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
        if (isReleaseTraceNode(state.nodeId)) {
          console.info("[RELEASE-TRACE][pointer][resize-transient]", {
            nodeId: state.nodeId,
            handle,
            geometry,
          })
        }
        dispatch({ type: "SET_NODE_GEOMETRY", nodeId: state.nodeId, ...geometry, transient: true })
      }
    }

    const onPointerUp = () => {
      const state = pointerRef.current
      if (isReleaseTraceNode(state.nodeId)) {
        const current = state.nodeId ? nodesRef.current.get(state.nodeId) : null
        console.info("[RELEASE-TRACE][pointer][up-before-commit]", {
          nodeId: state.nodeId,
          mode: state.mode,
          lastGeometry: state.lastGeometry,
          currentGeometry: current?.geometry || null,
        })
      }
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
  }, [isEditing, dispatch, selectedId, undo, redo, getEditableAtPosition])

  if (!isEditing) {
    return null
  }

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
          <span className={`ml-1 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            deployStatus === "success" ? "bg-emerald-600/80" :
            deployStatus === "partial" ? "bg-amber-500/80" :
            deployStatus === "failed" ? "bg-red-600/80" :
            "bg-black/25"
          }`}>
            {deployStatus === "success" ? "Success — changes published" :
              deployStatus === "partial" ? "Partial — some changes saved" :
              deployStatus === "failed" ? "Failed — changes not saved" :
              "Saving..."}
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
            <details>
              <summary className="cursor-pointer text-xs text-slate-200">Technical details</summary>
              <pre className="mt-2 max-h-[55vh] overflow-auto whitespace-pre-wrap rounded border border-white/15 bg-black/35 p-3 text-xs text-slate-100 select-text">{deployDetails}</pre>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={onCopyDeployDetails} className="rounded border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10">
                  Copy details
                </button>
                {copyState === "copied" && <span className="text-xs text-emerald-300">Copied</span>}
                {copyState === "failed" && <span className="text-xs text-red-300">Copy failed</span>}
              </div>
            </details>
          </div>
        </div>
      )}

      {selectedEntry && <SelectionOverlay entry={selectedEntry} />}

      {openPanel && selectedNode && (
        <div
          data-editor-panel
          className="fixed top-16 right-3 z-[9997] w-80 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain rounded-xl bg-white text-slate-900 shadow-2xl"
          onKeyDown={(e) => {
            if (isEditingInput(e.target)) return
            const ctrl = e.metaKey || e.ctrlKey
            if (!ctrl) return
            const key = e.key.toLowerCase()
            if (key === "z") {
              e.preventDefault()
              if (e.shiftKey) redo()
              else undo()
              return
            }
            if (key === "c" && selectedId) {
              e.preventDefault()
              dispatch({ type: "COPY_NODE", nodeId: selectedId })
              return
            }
            if (key === "v") {
              e.preventDefault()
              dispatch({ type: "PASTE_NODE", targetNodeId: selectedId || undefined })
            }
          }}
        >
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
              <div className="space-y-3 rounded border border-slate-200 p-2">
                <div className="text-[11px] font-semibold">
                  {selectedBandMemberIndex === 0 ? "Janosch Card Editor" : `Member ${selectedBandMemberIndex + 1} Preview`}
                </div>

                <div className="space-y-2 rounded border border-slate-200 p-2">
                  <div className="text-[10px] font-semibold">Card / Box</div>
                  {(() => {
                    const cardNode = nodes.get(`member-item-${selectedBandMemberIndex}`) || null
                    const gradientEnabled = !!cardNode?.content.gradientEnabled
                    return (
                      <div className="space-y-2">
                        <label className="text-[10px]">
                          Box opacity ({Math.round((cardNode?.style.opacity ?? 1) * 100)}%)
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            className="w-full"
                            value={cardNode?.style.opacity ?? 1}
                            onChange={(e) => updateBandMemberCardStyle(selectedBandMemberIndex, { opacity: Number(e.target.value) })}
                          />
                        </label>

                        <label className="flex items-center gap-2 text-[10px]">
                          <input
                            type="checkbox"
                            checked={gradientEnabled}
                            onChange={(e) => updateBandMemberCardStyle(selectedBandMemberIndex, {
                              gradientEnabled: e.target.checked,
                              gradientStart: e.target.checked ? (cardNode?.content.gradientStart || "#111111") : undefined,
                              gradientEnd: e.target.checked ? (cardNode?.content.gradientEnd || "#000000") : undefined,
                            })}
                          />
                          Box gradient
                        </label>

                        <label className="text-[10px]">
                          Box color
                          <input
                            type="color"
                            className="mt-1 h-7 w-full rounded border"
                            value={cardNode?.style.backgroundColor || "#0a0a0a"}
                            onChange={(e) => updateBandMemberCardStyle(selectedBandMemberIndex, { backgroundColor: e.target.value })}
                          />
                        </label>

                        {gradientEnabled && (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px]">
                              Start
                              <input
                                type="color"
                                className="mt-1 h-7 w-full rounded border"
                                value={cardNode?.content.gradientStart || "#111111"}
                                onChange={(e) => updateBandMemberCardStyle(selectedBandMemberIndex, { gradientStart: e.target.value })}
                              />
                            </label>
                            <label className="text-[10px]">
                              End
                              <input
                                type="color"
                                className="mt-1 h-7 w-full rounded border"
                                value={cardNode?.content.gradientEnd || "#000000"}
                                onChange={(e) => updateBandMemberCardStyle(selectedBandMemberIndex, { gradientEnd: e.target.value })}
                              />
                            </label>
                          </div>
                        )}

                        <button
                          type="button"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-[10px] font-semibold"
                          onClick={() => arrangeBandMemberCard(selectedBandMemberIndex)}
                        >
                          Arrange / Auto-position
                        </button>
                      </div>
                    )
                  })()}
                </div>

                {selectedBandMemberIndex === 0 && (
                  <div className="space-y-2 rounded border border-slate-200 p-2">
                    <div className="text-[10px] font-semibold">Text editors</div>
                    {(["number", "name", "role"] as const).map((field) => {
                      const node = getBandMemberNode(selectedBandMemberIndex, field)
                      const currentText = getBandMemberFieldValue(selectedBandMemberIndex, field)
                      const textAlign = node?.style.textAlign || "left"
                      const gradientEnabled = !!node?.content.gradientEnabled
                      return (
                        <div key={`member-field-${field}`} className="space-y-1 rounded border border-slate-200 p-2">
                          <label className="text-[10px] font-semibold capitalize">{field}</label>
                          <input
                            className="w-full rounded border p-1 text-xs"
                            value={currentText}
                            onChange={(e) => updateBandMemberField(selectedBandMemberIndex, field, e.target.value)}
                          />

                          <label className="text-[10px]">
                            Color
                            <input
                              type="color"
                              className="mt-1 h-7 w-full rounded border"
                              value={node?.style.color || "#ffffff"}
                              onChange={(e) => updateBandMemberTextStyle(selectedBandMemberIndex, field, { color: e.target.value })}
                            />
                          </label>

                          <div className="flex items-center gap-1">
                            <button className="rounded border px-2 py-1 text-[10px]" onClick={() => updateBandMemberTextStyle(selectedBandMemberIndex, field, { fontWeight: node?.style.fontWeight === "700" ? "400" : "700" })}>B</button>
                            <button className="rounded border px-2 py-1 text-[10px] italic" onClick={() => updateBandMemberTextStyle(selectedBandMemberIndex, field, { fontStyle: node?.style.fontStyle === "italic" ? "normal" : "italic" })}>I</button>
                            <button className="rounded border px-2 py-1 text-[10px] underline" onClick={() => updateBandMemberTextStyle(selectedBandMemberIndex, field, { textDecoration: node?.style.textDecoration === "underline" ? "none" : "underline" })}>U</button>
                            <button className="rounded border px-2 py-1 text-[10px]" onClick={() => updateBandMemberTextStyle(selectedBandMemberIndex, field, { textAlign: "left" })} disabled={textAlign === "left"}>L</button>
                            <button className="rounded border px-2 py-1 text-[10px]" onClick={() => updateBandMemberTextStyle(selectedBandMemberIndex, field, { textAlign: "center" })} disabled={textAlign === "center"}>C</button>
                            <button className="rounded border px-2 py-1 text-[10px]" onClick={() => updateBandMemberTextStyle(selectedBandMemberIndex, field, { textAlign: "right" })} disabled={textAlign === "right"}>R</button>
                          </div>

                          <label className="flex items-center gap-2 text-[10px]">
                            <input
                              type="checkbox"
                              checked={gradientEnabled}
                              onChange={(e) =>
                                updateBandMemberTextStyle(selectedBandMemberIndex, field, {
                                  gradientEnabled: e.target.checked,
                                  gradientStart: e.target.checked ? (node?.content.gradientStart || "#FFB15A") : undefined,
                                  gradientEnd: e.target.checked ? (node?.content.gradientEnd || "#FF6C00") : undefined,
                                })
                              }
                            />
                            Gradient
                          </label>
                          {gradientEnabled && (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="text-[10px]">
                                Start
                                <input
                                  type="color"
                                  className="mt-1 h-7 w-full rounded border"
                                  value={node?.content.gradientStart || "#FFB15A"}
                                  onChange={(e) => updateBandMemberTextStyle(selectedBandMemberIndex, field, { gradientStart: e.target.value })}
                                />
                              </label>
                              <label className="text-[10px]">
                                End
                                <input
                                  type="color"
                                  className="mt-1 h-7 w-full rounded border"
                                  value={node?.content.gradientEnd || "#FF6C00"}
                                  onChange={(e) => updateBandMemberTextStyle(selectedBandMemberIndex, field, { gradientEnd: e.target.value })}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-2 rounded border border-slate-200 p-2">
                  <label className="text-[10px] font-semibold">Photo</label>
                  {(() => {
                    const imageSrc = getBandMemberFieldValue(selectedBandMemberIndex, "photo")
                    return imageSrc ? <img src={imageSrc} alt={`Member ${selectedBandMemberIndex + 1} preview`} className="h-20 w-20 rounded object-cover" /> : null
                  })()}

                  {selectedBandMemberIndex === 0 && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-xs"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const nodeId = `member-item-${selectedBandMemberIndex}-image`
                          await uploadEditorImageAsset(nodeId, "image", file)
                        }}
                      />
                      {assetUploadState[`member-item-${selectedBandMemberIndex}-image`] && (
                        <div className="text-[10px] text-slate-600">
                          Upload status: <span className="font-semibold capitalize">{assetUploadState[`member-item-${selectedBandMemberIndex}-image`]?.status}</span>
                          {assetUploadState[`member-item-${selectedBandMemberIndex}-image`]?.message ? ` — ${assetUploadState[`member-item-${selectedBandMemberIndex}-image`]?.message}` : ""}
                        </div>
                      )}
                    </>
                  )}

                  {(() => {
                    const imageNode = getBandMemberNode(selectedBandMemberIndex, "photo")
                    return (
                      <div className="space-y-1">
                        <label className="text-[10px]">Contrast ({Math.round(imageNode?.style.contrast ?? 100)}%)</label>
                        <input type="range" min={50} max={200} value={imageNode?.style.contrast ?? 100} onChange={(e) => updateBandMemberImageStyle(selectedBandMemberIndex, { contrast: Number(e.target.value) })} className="w-full" />
                        <label className="text-[10px]">Saturation ({Math.round(imageNode?.style.saturation ?? 100)}%)</label>
                        <input type="range" min={0} max={200} value={imageNode?.style.saturation ?? 100} onChange={(e) => updateBandMemberImageStyle(selectedBandMemberIndex, { saturation: Number(e.target.value) })} className="w-full" />
                        <label className="text-[10px]">Brightness ({Math.round(imageNode?.style.brightness ?? 100)}%)</label>
                        <input type="range" min={50} max={200} value={imageNode?.style.brightness ?? 100} onChange={(e) => updateBandMemberImageStyle(selectedBandMemberIndex, { brightness: Number(e.target.value) })} className="w-full" />
                        <label className="text-[10px]">Photo opacity ({Math.round((imageNode?.style.opacity ?? 1) * 100)}%)</label>
                        <input type="range" min={0} max={1} step={0.01} value={imageNode?.style.opacity ?? 1} onChange={(e) => updateBandMemberImageStyle(selectedBandMemberIndex, { opacity: Number(e.target.value) })} className="w-full" />
                        <label className="flex items-center gap-2 text-[10px]">
                          <input type="checkbox" checked={imageNode?.style.negative ?? false} onChange={(e) => updateBandMemberImageStyle(selectedBandMemberIndex, { negative: e.target.checked })} />
                          Negative
                        </label>
                      </div>
                    )
                  })()}
                </div>

                {selectedBandMemberIndex !== 0 && (
                  <div className="text-[10px] text-slate-600">
                    Full inline editing remains focused on Janosch (`member-item-0`) in this pass.
                  </div>
                )}
              </div>
            )}

            {selectedConcertCardId && concertDraft && (
              <div className="space-y-2 rounded border border-slate-200 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold">Date</label>
                    <input
                      type="date"
                      className="w-full rounded border p-1 text-xs"
                      value={concertDraft.date}
                      onChange={(e) => {
                        const next = { ...concertDraft, date: e.target.value }
                        setConcertDraft(next)
                        updateConcertCardField(selectedConcertCardId, "date", e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold">Time</label>
                    <input
                      type="time"
                      className="w-full rounded border p-1 text-xs"
                      value={concertDraft.time}
                      onChange={(e) => {
                        const next = { ...concertDraft, time: e.target.value }
                        setConcertDraft(next)
                        updateConcertCardField(selectedConcertCardId, "time", e.target.value)
                      }}
                    />
                  </div>
                </div>
                <label className="text-[11px] font-semibold">Venue</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  value={concertDraft.venue}
                  onChange={(e) => {
                    const next = { ...concertDraft, venue: e.target.value }
                    setConcertDraft(next)
                    updateConcertCardField(selectedConcertCardId, "venue", e.target.value)
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold">City</label>
                    <input
                      className="w-full rounded border p-1 text-xs"
                      value={concertDraft.city}
                      onChange={(e) => {
                        const next = { ...concertDraft, city: e.target.value }
                        setConcertDraft(next)
                        updateConcertCardField(selectedConcertCardId, "city", e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold">Country</label>
                    <input
                      className="w-full rounded border p-1 text-xs"
                      value={concertDraft.country}
                      onChange={(e) => {
                        const next = { ...concertDraft, country: e.target.value }
                        setConcertDraft(next)
                        updateConcertCardField(selectedConcertCardId, "country", e.target.value)
                      }}
                    />
                  </div>
                </div>
                <label className="text-[11px] font-semibold">Google Maps URL</label>
                <input
                  type="url"
                  className="w-full rounded border p-1 text-xs"
                  placeholder="Paste Google Maps link here"
                  value={concertDraft.locationUrl}
                  onChange={(e) => {
                    const next = { ...concertDraft, locationUrl: e.target.value }
                    setConcertDraft(next)
                    updateConcertCardField(selectedConcertCardId, "locationUrl", e.target.value)
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold">Genre</label>
                    <select
                      className="w-full rounded border p-1 text-xs"
                      value={concertDraft.genre}
                      onChange={(e) => {
                        const next = { ...concertDraft, genre: e.target.value }
                        setConcertDraft(next)
                        updateConcertCardField(selectedConcertCardId, "genre", e.target.value)
                      }}
                    >
                      <option value="World Music">World Music</option>
                      <option value="Funk">Funk</option>
                      <option value="Soul">Soul</option>
                      <option value="Jazz">Jazz</option>
                      <option value="Fusion">Fusion</option>
                      <option value="Afrobeat">Afrobeat</option>
                      <option value="Latin">Latin</option>
                      <option value="Disco">Disco</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold">Price</label>
                    <input
                      className="w-full rounded border p-1 text-xs"
                      value={concertDraft.price}
                      onChange={(e) => {
                        const next = { ...concertDraft, price: e.target.value }
                        setConcertDraft(next)
                        updateConcertCardField(selectedConcertCardId, "price", e.target.value)
                      }}
                    />
                  </div>
                </div>
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
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-800">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={!!segment.gradientEnabled}
                          onChange={(e) => {
                            const next = [...(selectedNode.content.textSegments || [])]
                            const cur = next[index]
                            next[index] = {
                              ...cur,
                              gradientEnabled: e.target.checked,
                              gradientStart: cur.gradientStart || "#FFB15A",
                              gradientEnd: cur.gradientEnd || "#FF6C00",
                            }
                            dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { textSegments: next } })
                          }}
                        />
                        Gradient text (this phrase)
                      </label>
                      {segment.gradientEnabled && (
                        <div className="mt-1 grid grid-cols-2 gap-2 rounded border border-orange-200 bg-orange-50/80 p-2">
                          <div>
                            <div className="mb-0.5 text-[10px] font-medium text-slate-600">Gradient start</div>
                            <input
                              type="color"
                              className="h-8 w-full rounded border border-slate-200"
                              value={segment.gradientStart || "#FFB15A"}
                              onChange={(e) => {
                                const next = [...(selectedNode.content.textSegments || [])]
                                next[index] = { ...next[index], gradientStart: e.target.value }
                                dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { textSegments: next } })
                              }}
                            />
                          </div>
                          <div>
                            <div className="mb-0.5 text-[10px] font-medium text-slate-600">Gradient end</div>
                            <input
                              type="color"
                              className="h-8 w-full rounded border border-slate-200"
                              value={segment.gradientEnd || "#FF6C00"}
                              onChange={(e) => {
                                const next = [...(selectedNode.content.textSegments || [])]
                                next[index] = { ...next[index], gradientEnd: e.target.value }
                                dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { textSegments: next } })
                              }}
                            />
                          </div>
                        </div>
                      )}
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
                      const next = [
                        ...heroTitleSegments,
                        {
                          text: "New phrase",
                          color: "#ffffff",
                          bold: true,
                          italic: false,
                          underline: false,
                          opacity: 1,
                          gradientEnabled: false,
                          gradientStart: "#FFB15A",
                          gradientEnd: "#FF6C00",
                        },
                      ]
                      dispatch({
                        type: "UPDATE_TEXT",
                        nodeId: selectedNode.id,
                        patch: { titleSegments: next, textSegments: next, text: next.map((s) => s.text).join(" ").trim() },
                      })
                    }}
                  >
                    Add phrase
                  </button>
                </div>
              </>
            )}

            {(selectedNode.type === "text" || selectedNode.type === "button") && !selectedIsBandMemberCard && !(selectedNode.type === "text" && selectedNode.id === "hero-title" && heroTitleSegments.length > 0) && (
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
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={!!selectedNode.content.gradientEnabled}
                    onChange={(e) => {
                      const gradientEnabled = e.target.checked
                      dispatch({ 
                        type: "UPDATE_TEXT", 
                        nodeId: selectedNode.id, 
                        patch: { 
                          gradientEnabled,
                          gradientStart: gradientEnabled ? (selectedNode.content.gradientStart || "#FFB15A") : undefined,
                          gradientEnd: gradientEnabled ? (selectedNode.content.gradientEnd || "#FF6C00") : undefined,
                        } 
                      })
                    }}
                  />
                  Gradient text
                </label>
                {selectedNode.content.gradientEnabled && (
                  <div className="mt-1 grid grid-cols-2 gap-2 rounded border border-orange-200 bg-orange-50/80 p-2">
                    <div>
                      <div className="mb-0.5 text-[10px] font-medium text-slate-600">Gradient start</div>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-slate-200"
                        value={selectedNode.content.gradientStart || "#FFB15A"}
                        onChange={(e) => {
                          dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { gradientStart: e.target.value } })
                        }}
                      />
                    </div>
                    <div>
                      <div className="mb-0.5 text-[10px] font-medium text-slate-600">Gradient end</div>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-slate-200"
                        value={selectedNode.content.gradientEnd || "#FF6C00"}
                        onChange={(e) => {
                          dispatch({ type: "UPDATE_TEXT", nodeId: selectedNode.id, patch: { gradientEnd: e.target.value } })
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedNode.type === "button" && (
              <>
                <label className="text-xs font-semibold">Link</label>
                <input
                  className="w-full rounded border p-1 text-xs"
                  value={selectedNode.content.href || ""}
                  onChange={(e) => dispatch({ type: "UPDATE_BUTTON", nodeId: selectedNode.id, patch: { href: e.target.value } })}
                />
              </>
            )}

            {selectedNode.type === "image" && selectedNode.id === "hero-logo" && (
              <>
                <label className="text-xs font-semibold">Hero Logo Position & Size</label>
                <div className="space-y-2 text-xs">
                  <div>
                    <label>X Position (px)</label>
                    <input
                      type="number"
                      className="w-full rounded border p-1 text-xs"
                      value={selectedNode.geometry.x}
                      onChange={(e) => dispatch({ type: "MOVE_NODE", nodeId: selectedNode.id, dx: Number(e.target.value) - selectedNode.geometry.x, dy: 0, transient: true })}
                      onBlur={(e) => dispatch({ type: "MOVE_NODE", nodeId: selectedNode.id, dx: Number(e.target.value) - selectedNode.geometry.x, dy: 0 })}
                    />
                  </div>
                  <div>
                    <label>Y Position (px)</label>
                    <input
                      type="number"
                      className="w-full rounded border p-1 text-xs"
                      value={selectedNode.geometry.y}
                      onChange={(e) => dispatch({ type: "MOVE_NODE", nodeId: selectedNode.id, dx: 0, dy: Number(e.target.value) - selectedNode.geometry.y, transient: true })}
                      onBlur={(e) => dispatch({ type: "MOVE_NODE", nodeId: selectedNode.id, dx: 0, dy: Number(e.target.value) - selectedNode.geometry.y })}
                    />
                  </div>
                  <div>
                    <label>Width (px)</label>
                    <input
                      type="number"
                      className="w-full rounded border p-1 text-xs"
                      value={selectedNode.geometry.width}
                      onChange={(e) => dispatch({ type: "RESIZE_NODE", nodeId: selectedNode.id, width: Number(e.target.value), height: selectedNode.geometry.height, transient: true })}
                      onBlur={(e) => dispatch({ type: "RESIZE_NODE", nodeId: selectedNode.id, width: Number(e.target.value), height: selectedNode.geometry.height })}
                    />
                  </div>
                </div>
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
                    await uploadEditorImageAsset(
                      selectedNode.id,
                      selectedNode.type === "image" ? "image" : "background",
                      file
                    )
                    e.currentTarget.value = ""
                  }}
                />
                {assetUploadState[selectedNode.id] && (
                  <div className="rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
                    Upload status: <span className="font-semibold capitalize">{assetUploadState[selectedNode.id]?.status}</span>
                    {assetUploadState[selectedNode.id]?.message ? ` — ${assetUploadState[selectedNode.id]?.message}` : ""}
                  </div>
                )}
                {selectedImageSrcIsNonPersistable && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                    Temporary preview URL (`blob:` / `data:`). This source is not persistable and will not survive refresh.
                  </div>
                )}
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

            {selectedNode.type === "card" && selectedIsLinkGroup && (
              <>
                <div className="rounded border border-slate-200 p-2 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-700 mb-2">{selectedLinkGroupSummary}</div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedLinkGroupItems.map((item) => (
                      <div key={item.id} className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-slate-600">{item.name}</label>
                        <input
                          className="w-full rounded border p-1 text-xs"
                          defaultValue={item.href}
                          onChange={(e) => updateLinkItemHref(item.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedNode.type === "card" && !selectedIsBandMemberCard && !selectedIsLinkGroup && !selectedConcertCardId && (
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
