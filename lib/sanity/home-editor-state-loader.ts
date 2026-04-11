import { createClient } from "next-sanity"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

interface HomeEditorStateRaw {
  nodesJson?: string
}

function createReadClient() {
  return createClient({
    projectId: resolveSanityProjectId(),
    dataset: resolveSanityDataset(),
    apiVersion: "2024-01-01",
    useCdn: false,
    perspective: "published",
  })
}

export async function loadHomeEditorState(): Promise<HomeEditorNodeOverride[]> {
  try {
    const client = createReadClient()
    const doc = await client.fetch<HomeEditorStateRaw | null>(
      `*[_id == "homeEditorState-singleton"][0]{ nodesJson }`
    )
    const raw = JSON.parse(doc?.nodesJson || "[]")
    if (!Array.isArray(raw)) return []

    return raw
      .map((raw): HomeEditorNodeOverride | null => {
        if (!raw || typeof raw !== "object") return null
        const n = raw as Record<string, unknown>
        const nodeId = typeof n.nodeId === "string" ? n.nodeId : typeof n.id === "string" ? n.id : null
        if (!nodeId) return null
        const nodeType = typeof n.nodeType === "string" ? n.nodeType : typeof n.type === "string" ? n.type : "text"
        const geometry = (n.geometry && typeof n.geometry === "object" ? n.geometry : {}) as Record<string, unknown>
        const style = (n.style && typeof n.style === "object" ? n.style : {}) as Record<string, unknown>
        const content = (n.content && typeof n.content === "object" ? n.content : {}) as Record<string, unknown>
        return {
          nodeId,
          nodeType: nodeType as HomeEditorNodeOverride["nodeType"],
          geometry: {
            x: typeof geometry.x === "number" ? geometry.x : 0,
            y: typeof geometry.y === "number" ? geometry.y : 0,
            width: typeof geometry.width === "number" ? geometry.width : 0,
            height: typeof geometry.height === "number" ? geometry.height : 0,
          },
          style: style as HomeEditorNodeOverride["style"],
          content: content as HomeEditorNodeOverride["content"],
          explicitContent: Boolean(n.explicitContent),
          explicitStyle: Boolean(n.explicitStyle),
          explicitPosition: Boolean(n.explicitPosition),
          explicitSize: Boolean(n.explicitSize),
          updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : new Date().toISOString(),
        }
      })
      .filter((node): node is HomeEditorNodeOverride => Boolean(node))
  } catch (error) {
    console.error("[home-editor-state-loader] Failed to load home editor state", error)
    return []
  }
}
