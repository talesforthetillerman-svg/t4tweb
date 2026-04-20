"use client"

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"
import { getTraceNodeId } from "@/lib/sanity/env"

interface HomeEditorOverridesContextValue {
  resolveImageSrc: (nodeId: string, fallback: string) => string
}

const HomeEditorOverridesContext = createContext<HomeEditorOverridesContextValue>({
  resolveImageSrc: (_nodeId: string, fallback: string) => fallback,
})

const DOC_DRIVEN_IMAGE_NODE_IDS = new Set<string>([
  "hero-bg-image",
  "hero-logo",
  "nav-logo",
  "intro-banner-gif",
  "about-bg-image",
  "press-kit-bg",
])

const HERO_DOC_DRIVEN_IMAGE_NODE_IDS = new Set<string>([
  "hero-bg-image",
  "hero-logo",
])

const ABOUT_DOC_DRIVEN_NODE_IDS = new Set<string>([
  "about-section",
  "about-bg-image",
  "about-header-eyebrow",
  "about-header-title",
  "about-text-card",
  "about-text-1",
  "about-text-2",
  "about-tags",
  "about-copy-button",
])

const PRESS_KIT_DOC_DRIVEN_NODE_IDS = new Set<string>([
  "press-kit-section",
  "press-kit-bg",
  "press-kit-main-card",
  "press-kit-folder-icon",
  "press-kit-title",
  "press-kit-description",
  "press-kit-download-button",
  "press-kit-resource-0",
  "press-kit-resource-1",
  "press-kit-manager",
])

function isValidPersistedSrc(value: unknown): value is string {
  if (typeof value !== "string") return false
  const src = value.trim()
  if (!src) return false
  if (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("javascript:")) return false
  return true
}

export function HomeEditorOverridesProvider({ nodes, children }: { nodes: HomeEditorNodeOverride[]; children: ReactNode }) {
  const traceNodeId = getTraceNodeId()

  const normalizedNodes = useMemo<HomeEditorNodeOverride[]>(() => Array.isArray(nodes) ? nodes : [], [nodes])

  // Diagnostic log for array check
  if (typeof window !== "undefined") {
    console.log("[EDITOR-REHYDRATE][provider-input-type]", {
      isArray: Array.isArray(nodes),
      length: Array.isArray(nodes) ? nodes.length : null,
    });
    console.log("[EDITOR-REHYDRATE][provider-is-array-check]", {
      isArray: Array.isArray(normalizedNodes),
      constructorName: normalizedNodes?.constructor?.name ?? null,
      length: Array.isArray(normalizedNodes) ? normalizedNodes.length : null,
    });
  }

  const srcByNodeId = useMemo(() => {
    const map = new Map<string, string>()
    if (Array.isArray(normalizedNodes)) {
      normalizedNodes.forEach((node) => {
        if (DOC_DRIVEN_IMAGE_NODE_IDS.has(node.nodeId)) return
        if ((node.nodeType === "image" || node.nodeType === "background") && node.explicitContent && isValidPersistedSrc(node.content.src)) {
          map.set(node.nodeId, node.content.src)
        }
      })
    }
    return map
  }, [normalizedNodes])

  useEffect(() => {
    // Populate window.__HOME_EDITOR_NODE_OVERRIDES__ for visual-editor hydration
    if (typeof window === "undefined") return

    try {
      if (!Array.isArray(normalizedNodes)) {
        (window as any).__HOME_EDITOR_NODE_OVERRIDES__ = {}
        return
      }

      if (normalizedNodes.length === 0) {
        (window as any).__HOME_EDITOR_NODE_OVERRIDES__ = {}
        console.log("[EDITOR-REHYDRATE][provider-window-write]", { count: 0, reason: "no nodes" })
        return
      }

      const nodeOverridesMap: Record<string, typeof normalizedNodes[0]> = {}
      const skippedDocDrivenNodes: string[] = []
      normalizedNodes.forEach((node) => {
        if (
          HERO_DOC_DRIVEN_IMAGE_NODE_IDS.has(node.nodeId) ||
          ABOUT_DOC_DRIVEN_NODE_IDS.has(node.nodeId) ||
          PRESS_KIT_DOC_DRIVEN_NODE_IDS.has(node.nodeId)
        ) {
          skippedDocDrivenNodes.push(node.nodeId)
          return
        }
        nodeOverridesMap[node.nodeId] = node;
      });
      (window as any).__HOME_EDITOR_NODE_OVERRIDES__ = nodeOverridesMap;
      console.log("[EDITOR-REHYDRATE][provider-normalized-count]", {
        count: Object.keys(nodeOverridesMap).length,
        nodeIds: Object.keys(nodeOverridesMap),
        skippedDocDrivenNodes,
      });
    } catch (err) {
      console.error("[EDITOR-REHYDRATE][provider-invalid-input]", { error: "window write failed", message: err instanceof Error ? err.message : String(err) });
      (window as any).__HOME_EDITOR_NODE_OVERRIDES__ = {};
    }
  }, [normalizedNodes])

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && traceNodeId && Array.isArray(normalizedNodes)) {
      const tracedNode = normalizedNodes.find((node) => node.nodeId === traceNodeId)
      console.info("[home-editor-overrides-provider][trace]", {
        traceNodeId,
        foundInNodes: !!tracedNode,
        mappedSrc: srcByNodeId.get(traceNodeId) || null,
        docDrivenBlocked:
          DOC_DRIVEN_IMAGE_NODE_IDS.has(traceNodeId) ||
          ABOUT_DOC_DRIVEN_NODE_IDS.has(traceNodeId) ||
          PRESS_KIT_DOC_DRIVEN_NODE_IDS.has(traceNodeId),
        node: tracedNode || null,
      })
    }
  }, [normalizedNodes, srcByNodeId, traceNodeId])

  const value = useMemo<HomeEditorOverridesContextValue>(() => ({
    resolveImageSrc: (nodeId: string, fallback: string) => srcByNodeId.get(nodeId) || fallback,
  }), [srcByNodeId])

  return <HomeEditorOverridesContext.Provider value={value}>{children}</HomeEditorOverridesContext.Provider>
}

export function useHomeEditorImageSrc(nodeId: string, fallback: string): string {
  const { resolveImageSrc } = useContext(HomeEditorOverridesContext)
  return resolveImageSrc(nodeId, fallback)
}
