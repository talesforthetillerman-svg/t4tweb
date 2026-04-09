"use client"

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

interface HomeEditorOverridesContextValue {
  resolveImageSrc: (nodeId: string, fallback: string) => string
}

const HomeEditorOverridesContext = createContext<HomeEditorOverridesContextValue>({
  resolveImageSrc: (_nodeId: string, fallback: string) => fallback,
})

const DOC_DRIVEN_IMAGE_NODE_IDS = new Set<string>([
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
    const introNode = nodes.find((node) => node.nodeId === "intro-banner-gif")
    console.info("[INTRO-TRACE][overrides-provider]", {
      hasIntroNodeInCentralState: !!introNode,
      introNodeContentSrc: introNode?.content?.src || null,
      introNodeExplicitContent: introNode?.explicitContent ?? null,
      mappedSrc: srcByNodeId.get("intro-banner-gif") || null,
      docDrivenBlocked: DOC_DRIVEN_IMAGE_NODE_IDS.has("intro-banner-gif"),
    })
  }, [nodes, srcByNodeId])

  const value = useMemo<HomeEditorOverridesContextValue>(() => ({
    resolveImageSrc: (nodeId: string, fallback: string) => srcByNodeId.get(nodeId) || fallback,
  }), [srcByNodeId])

  return <HomeEditorOverridesContext.Provider value={value}>{children}</HomeEditorOverridesContext.Provider>
}

export function useHomeEditorImageSrc(nodeId: string, fallback: string): string {
  const { resolveImageSrc } = useContext(HomeEditorOverridesContext)
  return resolveImageSrc(nodeId, fallback)
}
