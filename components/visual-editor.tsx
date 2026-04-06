"use client"
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { MotionConfig } from "framer-motion"

type NodeType = "section" | "background" | "card" | "text" | "button" | "image"

type Point = { x: number; y: number }

type Size = { width: number; height: number }

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

interface RuntimeEntry {
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

function isEditingInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

function normalizeType(raw: string): NodeType {
  if (raw === "section" || raw === "background" || raw === "card" || raw === "text" || raw === "button" || raw === "image") {
    return raw
  }
  return "text"
}

function parseGrouped(value: string | null): boolean {
  return value === "true"
}

function rgbToHex(rgb: string): string {
  if (!rgb) return "#ffffff"
  if (rgb.startsWith("#")) return rgb
  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return "#ffffff"
  const [r, g, b] = match.slice(0, 3).map(Number)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
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

function buildNodeFromEntry(entry: RuntimeEntry): EditorNode {
  const el = entry.element
  const content: EditorNode["content"] = {}
  if (entry.type === "text" || entry.type === "button" || entry.type === "card") {
    content.text = el.textContent?.trim() || ""
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
  return {
    id: entry.id,
    type: entry.type,
    sectionId: entry.sectionId,
    label: entry.label,
    isGrouped: entry.isGrouped,
    geometry: { x: 0, y: 0, width: entry.rect.width, height: entry.rect.height },
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
    setRegistry(nextRegistry)
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
      if (node.explicitContent && node.content.text !== undefined) el.textContent = node.content.text
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
        next.set(nodeId, updater(node))
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
              if (["text", "href", "src", "alt", "videoUrl"].includes(k)) {
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
      const bound = candidate.closest<HTMLElement>("[data-editor-node-id]")
      if (!bound?.dataset.editorNodeId) continue
      const entry = registry.get(bound.dataset.editorNodeId)
      if (!entry || !entry.eligible) continue
      if (!candidates.find((c) => c.id === entry.id)) candidates.push(entry)
    }

    if (candidates.length === 0) return null
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
        className="absolute border-2 border-[#FF8C21] shadow-[0_0_0_1px_rgba(255,140,33,0.3),0_0_12px_rgba(255,140,33,0.15)]"
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

  const selectedEntry = selectedId ? registry.get(selectedId) || null : null
  const selectedNode = selectedId ? nodes.get(selectedId) || null : null
  const exitEditor = () => {
    setIsEditing(false)
    window.location.reload()
  }

  const pointerRef = useRef<{
    mode: "move" | "resize" | null
    start: Point
    origin: NodeGeometry | null
    originScale: number
    handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null
    nodeId: string | null
    lastGeometry: NodeGeometry | null
    lastScale: number
  }>({ mode: null, start: { x: 0, y: 0 }, origin: null, originScale: 1, handle: null, nodeId: null, lastGeometry: null, lastScale: 1 })

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
        pointerRef.current = {
          mode: "resize",
          start: { x: e.clientX, y: e.clientY },
          origin: { ...n.geometry },
          originScale: n.style.scale ?? 1,
          handle,
          nodeId: resizeNodeId,
          lastGeometry: { ...n.geometry },
          lastScale: n.style.scale ?? 1,
        }
        return
      }
      if (target.closest("[data-editor-toolbar]") || target.closest("[data-editor-panel]") || target.closest("[data-editor-overlay]")) return
      const handleEl = target.closest<HTMLElement>("[data-editor-resize-handle]")
      if (handleEl && selectedId) {
        e.preventDefault()
        e.stopPropagation()
        const handle = (handleEl.dataset.editorResizeHandle || null) as "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null
        const n = nodes.get(selectedId)
        if (!n || !handle) return
        dispatch({ type: "BEGIN_TRANSACTION" })
        pointerRef.current = {
          mode: "resize",
          start: { x: e.clientX, y: e.clientY },
          origin: { ...n.geometry },
          handle,
          nodeId: selectedId,
          lastGeometry: { ...n.geometry },
        }
        return
      }
      const hit = getEditableAtPosition(e.clientX, e.clientY)
      if (hit) {
        e.preventDefault()
        e.stopPropagation()
        dispatch({ type: "SELECT_NODE", nodeId: hit.id })
        dispatch({ type: "BEGIN_TRANSACTION" })
        const n = nodes.get(hit.id)
        pointerRef.current = {
          mode: "move",
          start: { x: e.clientX, y: e.clientY },
          origin: n ? { ...n.geometry } : null,
          originScale: n?.style.scale ?? 1,
          handle: null,
          nodeId: hit.id,
          lastGeometry: n ? { ...n.geometry } : null,
          lastScale: n?.style.scale ?? 1,
        }
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
          const safeScale = Math.max(0.2, scale * state.originScale)
          nextWidth = state.origin.width
          nextHeight = state.origin.height
          if (handle.includes("w")) nextX = state.origin.x + (state.origin.width - nextWidth)
          if (handle.includes("n")) nextY = state.origin.y + (state.origin.height - nextHeight)
          pointerRef.current.lastScale = safeScale
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
        dispatch({ type: "SET_NODE_SCALE", nodeId: state.nodeId, scale: state.lastScale })
      }
      pointerRef.current.mode = null
      pointerRef.current.origin = null
      pointerRef.current.originScale = 1
      pointerRef.current.handle = null
      pointerRef.current.nodeId = null
      pointerRef.current.lastGeometry = null
      pointerRef.current.lastScale = 1
      dispatch({ type: "END_TRANSACTION" })
    }

    const shouldBlockPublicAction = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      if (target.closest("[data-editor-toolbar]") || target.closest("[data-editor-panel]") || target.closest("[data-editor-overlay]")) return false
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
  }, [isEditing, dispatch, selectedId, nodes, undo, redo, getEditableAtPosition])

  if (!isEditing) {
    return (
      <button
        data-editor-toolbar
        onClick={() => setIsEditing(true)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white shadow-xl"
        title="Edit mode"
      >
        ✎
      </button>
    )
  }

  return (
    <>
      <div data-editor-toolbar className="fixed top-3 left-3 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-3 py-2 text-white">
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
        <button onClick={() => dispatch({ type: "DESELECT_NODE" })}>Deselect</button>
        <button onClick={exitEditor}>Exit</button>
      </div>

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
            {(selectedNode.type === "text" || selectedNode.type === "button") && (
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
                  onChange={(e) => {
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
              </>
            )}

            {selectedNode.type === "background" && selectedNode.content.mediaKind === "video" && (
              <>
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
          </div>
        </div>
      )}
    </>
  )
}
