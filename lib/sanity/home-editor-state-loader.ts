import { createClient } from "next-sanity"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"
import { getTraceNodeId, resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

interface HomeEditorStateRaw {
  nodes?: HomeEditorNodeOverride[]
}

const DOC_DRIVEN_NODE_IDS = new Set<string>([
  "hero-bg-image",
  "hero-logo",
  "nav-logo",
  "intro-banner-gif",
])

function isDocDrivenNodeId(nodeId: string): boolean {
  if (DOC_DRIVEN_NODE_IDS.has(nodeId)) return true
  if (nodeId === "hero-section" || nodeId === "hero-title" || nodeId === "hero-subtitle" || nodeId === "hero-scroll-indicator" || nodeId === "hero-buttons") return true
  if (nodeId === "navigation" || nodeId === "navigation-inner" || nodeId === "nav-brand-name" || nodeId === "nav-book-button" || nodeId === "nav-mobile-book-button") return true
  if (/^nav-(link|mobile-link)-\d+$/.test(nodeId)) return true
  if (nodeId === "intro-section" || nodeId === "intro-banner-text" || nodeId === "intro-book-button" || nodeId === "intro-press-button") return true
  return false
}

export async function loadHomeEditorState(): Promise<HomeEditorNodeOverride[]> {
  try {
    const projectId = resolveSanityProjectId()
    const dataset = resolveSanityDataset()
    const traceNodeId = getTraceNodeId()
    const client = createClient({
      projectId,
      dataset,
      apiVersion: "2024-01-01",
      useCdn: false,
      perspective: "published",
    })

    const query = `*[_type == "homeEditorState" && _id == "homeEditorState"][0]{ nodes }`
    const fetched = await client.fetch<HomeEditorStateRaw | null>(query)

    if (!fetched?.nodes || !Array.isArray(fetched.nodes)) {
      if (process.env.NODE_ENV !== "production") {
        console.info("[home-editor-state-loader] no nodes", { projectId, dataset })
      }
      return []
    }

    const nodes = fetched.nodes.filter((node) => Boolean(node?.nodeId))
    const filteredNodes = nodes.filter((node) => !isDocDrivenNodeId(node.nodeId))
    if (process.env.NODE_ENV !== "production" && traceNodeId) {
      const tracedNode = filteredNodes.find((node) => node.nodeId === traceNodeId)
      console.info("[home-editor-state-loader][trace]", {
        traceNodeId,
        projectId,
        dataset,
        found: !!tracedNode,
        foundBeforeFiltering: nodes.some((node) => node.nodeId === traceNodeId),
        node: tracedNode || null,
      })
    }
    return filteredNodes
  } catch (error) {
    console.error("[home-editor-state-loader] Failed to load home editor state", error)
    return []
  }
}
