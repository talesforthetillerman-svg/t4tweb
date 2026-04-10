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
  const srcByNodeId = useMemo(() => {
    const map = new Map<string, string>()
    nodes.forEach((node) => {
      if (DOC_DRIVEN_IMAGE_NODE_IDS.has(node.nodeId)) return
      if ((node.nodeType === "image" || node.nodeType === "background") && node.explicitContent && isValidPersistedSrc(node.content.src)) {
        map.set(node.nodeId, node.content.src)
      }
    })
    return map
  }, [nodes])

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && traceNodeId) {
      const tracedNode = nodes.find((node) => node.nodeId === traceNodeId)
      console.info("[home-editor-overrides-provider][trace]", {
        traceNodeId,
        foundInNodes: !!tracedNode,
        mappedSrc: srcByNodeId.get(traceNodeId) || null,
        docDrivenBlocked: DOC_DRIVEN_IMAGE_NODE_IDS.has(traceNodeId),
        node: tracedNode || null,
      })
    }
  }, [nodes, srcByNodeId, traceNodeId])

  const value = useMemo<HomeEditorOverridesContextValue>(() => ({
    resolveImageSrc: (nodeId: string, fallback: string) => srcByNodeId.get(nodeId) || fallback,
  }), [srcByNodeId])

  return <HomeEditorOverridesContext.Provider value={value}>{children}</HomeEditorOverridesContext.Provider>
}

export function useHomeEditorImageSrc(nodeId: string, fallback: string): string {
  const { resolveImageSrc } = useContext(HomeEditorOverridesContext)
  return resolveImageSrc(nodeId, fallback)
}
