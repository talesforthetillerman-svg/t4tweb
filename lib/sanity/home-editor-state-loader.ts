import { createClient } from "next-sanity"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

interface HomeEditorStateRaw {
  nodes?: HomeEditorNodeOverride[]
}

export async function loadHomeEditorState(): Promise<HomeEditorNodeOverride[]> {
  try {
    const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "qtpb6qpz"
    const client = createClient({
      projectId,
      dataset: process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
      apiVersion: "2024-01-01",
      useCdn: false,
      perspective: "published",
    })

    const query = `*[_type == "homeEditorState" && _id == "homeEditorState"][0]{ nodes }`
    const fetched = await client.fetch<HomeEditorStateRaw | null>(query)

    if (!fetched?.nodes || !Array.isArray(fetched.nodes)) {
      return []
    }

    return fetched.nodes.filter((node) => Boolean(node?.nodeId))
  } catch (error) {
    console.error("[home-editor-state-loader] Failed to load home editor state", error)
    return []
  }
}
