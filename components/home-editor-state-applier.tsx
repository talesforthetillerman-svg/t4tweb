"use client"

import { useEffect } from "react"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

const DOC_DRIVEN_IMAGE_NODE_IDS = new Set<string>([
  "intro-banner-gif",
])

const RELEASE_TRACE_IDS = new Set<string>([
  "latest-release-section",
  "latest-release-bg",
  "latest-release-card",
  "latest-release-title",
  "latest-release-subtitle",
  "latest-release-watch-button",
  "latest-release-shows-button",
])

const COMPONENT_DRIVEN_NODE_IDS = new Set<string>([
  "latest-release-section",
  "latest-release-bg",
  "latest-release-card",
  "latest-release-title",
  "latest-release-subtitle",
  "latest-release-watch-button",
  "latest-release-shows-button",
])

function isComponentDrivenNode(nodeId: string): boolean {
  if (COMPONENT_DRIVEN_NODE_IDS.has(nodeId)) return true
  if (nodeId === "band-members-section") return true
  if (nodeId === "band-members-bg") return true
  if (/^member-item-\d+$/.test(nodeId)) return true
  if (nodeId === "live-section") return true
  if (nodeId === "live-section-bg-image") return true
  if (nodeId === "live-section-see-shows-button") return true
  if (nodeId === "live-stream-platforms-group") return true
  if (nodeId === "live-stream-platforms-title") return true
  if (nodeId.startsWith("live-streaming-")) return true
  if (nodeId === "live-social-platforms-group") return true
  if (nodeId === "live-social-platforms-title") return true
  if (nodeId.startsWith("live-social-")) return true
  if (nodeId === "live-upcoming-title") return true
  if (nodeId === "live-upcoming-list") return true
  if (nodeId === "live-upcoming-empty") return true
  if (nodeId === "live-upcoming-empty-text") return true
  if (nodeId === "live-history-title") return true
  if (nodeId === "live-history-list") return true
  if (nodeId === "live-history-empty") return true
  if (nodeId === "live-history-empty-text") return true
  if (/^live-(upcoming|history)-event-\d+(-(?:date|venue|city|genre|price|time))?$/.test(nodeId)) return true
  return false
}

function escapeEditorId(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id)
  }
  return id.replace(/(["\\#.:\[\]])/g, "\\$1")
}

export function HomeEditorStateApplier({ nodes }: { nodes: HomeEditorNodeOverride[] }) {
  useEffect(() => {
    if (!Array.isArray(nodes) || nodes.length === 0) return
    if (typeof window !== "undefined") {
      ;(window as Window & { __HOME_EDITOR_NODE_OVERRIDES__?: Record<string, HomeEditorNodeOverride> }).__HOME_EDITOR_NODE_OVERRIDES__ =
        Object.fromEntries(nodes.map((node) => [node.nodeId, node]))
    }
    const introNode = nodes.find((node) => node.nodeId === "intro-banner-gif")
    console.info("[INTRO-TRACE][state-applier][begin]", {
      hasIntroNodeInCentralState: !!introNode,
      introNodeContentSrc: introNode?.content?.src || null,
      introNodeExplicitContent: introNode?.explicitContent ?? null,
      introNodeExplicitPosition: introNode?.explicitPosition ?? null,
      introNodeExplicitSize: introNode?.explicitSize ?? null,
    })

    const applyOverrides = () => {
      nodes.forEach((node) => {
      const traceRelease = RELEASE_TRACE_IDS.has(node.nodeId)
      if (traceRelease) {
        console.info("[RELEASE-TRACE][state-applier][before]", {
          nodeId: node.nodeId,
          geometry: node.geometry,
          explicitContent: node.explicitContent,
          explicitStyle: node.explicitStyle,
          explicitPosition: node.explicitPosition,
          explicitSize: node.explicitSize,
        })
      }
      const selector = `[data-editor-node-id="${escapeEditorId(node.nodeId)}"]`
      const el = document.querySelector<HTMLElement>(selector)
      if (!el) return

      if (isComponentDrivenNode(node.nodeId)) {
        return
      }

      const scale = typeof node.style.scale === "number" ? Math.max(0.1, node.style.scale) : 1

      if (node.explicitPosition || (node.explicitStyle && scale !== 1)) {
        el.style.transform = scale !== 1
          ? `translate(${Math.round(node.geometry.x)}px, ${Math.round(node.geometry.y)}px) scale(${scale})`
          : `translate(${Math.round(node.geometry.x)}px, ${Math.round(node.geometry.y)}px)`
        el.style.transformOrigin = "top left"
        el.dataset.editorManagedTransform = "true"
      } else {
        delete el.dataset.editorManagedTransform
      }

      if (node.explicitSize) {
        el.style.width = `${Math.max(8, Math.round(node.geometry.width))}px`
        el.style.height = `${Math.max(8, Math.round(node.geometry.height))}px`
        el.dataset.editorManagedSize = "true"
      } else {
        delete el.dataset.editorManagedSize
      }

      // Keep explicit flags/geometry discoverable when VisualEditor re-scans the DOM.
      el.dataset.editorExplicitContent = node.explicitContent ? "true" : "false"
      el.dataset.editorExplicitStyle = node.explicitStyle ? "true" : "false"
      el.dataset.editorExplicitPosition = node.explicitPosition ? "true" : "false"
      el.dataset.editorExplicitSize = node.explicitSize ? "true" : "false"
      el.dataset.editorGeometryX = String(Math.round(node.geometry.x))
      el.dataset.editorGeometryY = String(Math.round(node.geometry.y))
      el.dataset.editorGeometryWidth = String(Math.round(node.geometry.width))
      el.dataset.editorGeometryHeight = String(Math.round(node.geometry.height))

      if (node.explicitStyle) {
        if (node.style.opacity !== undefined) el.style.opacity = String(node.style.opacity)
        if ((node.nodeType === "text" || node.nodeType === "button") && node.content.gradientEnabled) {
          el.style.background = `linear-gradient(90deg, ${node.content.gradientStart || "#FFB15A"}, ${node.content.gradientEnd || "#FF6C00"})`
          el.style.webkitBackgroundClip = "text"
          el.style.backgroundClip = "text"
          el.style.webkitTextFillColor = "transparent"
          el.style.color = "transparent"
        } else {
          if (node.style.color) el.style.color = node.style.color
        }
        if (node.style.backgroundColor) el.style.backgroundColor = node.style.backgroundColor
        if (node.style.fontSize) el.style.fontSize = node.style.fontSize
        if (node.style.fontFamily) el.style.fontFamily = node.style.fontFamily
        if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight
        if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle
        if (node.style.textDecoration) el.style.textDecoration = node.style.textDecoration
        if (node.style.textAlign) el.style.textAlign = node.style.textAlign
        if (node.style.minHeight) el.style.minHeight = node.style.minHeight
        if (node.style.paddingTop) el.style.paddingTop = node.style.paddingTop
        if (node.style.paddingBottom) el.style.paddingBottom = node.style.paddingBottom
      }

      if (node.explicitContent) {
        if ((node.nodeType === "text" || node.nodeType === "button") && node.content.text !== undefined) {
          el.textContent = node.content.text
        }
        if ((node.nodeType === "button" || node.nodeType === "card") && node.content.href && (el.tagName === "A" || el.tagName === "BUTTON")) {
          el.setAttribute("href", node.content.href)
        }

        if (node.nodeType === "background" && node.content.mediaKind === "video") {
          const iframe = el.querySelector("iframe")
          if (iframe && node.content.videoUrl) {
            iframe.setAttribute("src", node.content.videoUrl)
          }
        } else if (node.nodeType === "image" || node.nodeType === "background") {
          if (DOC_DRIVEN_IMAGE_NODE_IDS.has(node.nodeId)) {
            if (node.nodeId === "intro-banner-gif") {
              console.info("[INTRO-TRACE][state-applier] skipped doc-driven image src apply", {
                nodeId: node.nodeId,
                contentSrc: node.content.src || null,
              })
            }
            return
          }
          const img = el.tagName === "IMG" ? (el as HTMLImageElement) : el.querySelector("img")
          if (img && node.content.src) img.src = node.content.src
          if (img && node.content.alt !== undefined) img.alt = node.content.alt
        }

        if (node.nodeType === "card") {
          if (node.content.gradientEnabled) {
            el.style.background = `linear-gradient(135deg, ${node.content.gradientStart || "#111111"}, ${node.content.gradientEnd || "#000000"})`
          }
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
      }

      if ((node.nodeType === "image" || node.nodeType === "background") && node.explicitStyle) {
        const contrast = node.style.contrast ?? 100
        const saturation = node.style.saturation ?? 100
        const brightness = node.style.brightness ?? 100
        const negative = node.style.negative ?? false
        const filterValue = `contrast(${contrast}%) saturate(${saturation}%) brightness(${brightness}%)${negative ? " invert(1)" : ""}`
        const img = el.tagName === "IMG" ? (el as HTMLImageElement) : el.querySelector("img")
        if (img) img.style.filter = filterValue
        else el.style.filter = filterValue
      }

      if (traceRelease) {
        console.info("[RELEASE-TRACE][state-applier][after]", {
          nodeId: node.nodeId,
          domStyle: {
            transform: el.style.transform || null,
            opacity: el.style.opacity || null,
            width: el.style.width || null,
            height: el.style.height || null,
          },
        })
      }
      })
    }

    // First pass (current DOM), then re-apply on late mounts (async/fetch/motion sections).
    applyOverrides()

    const retryTimers: number[] = []
    ;[200, 800].forEach((ms) => {
      const timer = window.setTimeout(() => applyOverrides(), ms)
      retryTimers.push(timer)
    })

    return () => {
      retryTimers.forEach((id) => window.clearTimeout(id))
    }
  }, [nodes])

  return null
}
