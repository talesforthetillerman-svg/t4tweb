import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface AboutData {
  elementStyles: Record<string, Record<string, unknown>>
}

const FALLBACK: AboutData = {
  elementStyles: {},
}

export async function loadAboutData(perspective: "published" | "drafts" = "published"): Promise<AboutData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective: perspective,
    })

    const query = `*[_type == "aboutSection"][0]{
      elementStyles
    }`

    const fetched = await client.fetch<Partial<AboutData> | null>(query)

    console.log("[loadAboutData] Query result:", {
      hasData: !!fetched,
      hasElementStyles: !!fetched?.elementStyles,
      elementStylesKeys: fetched?.elementStyles ? Object.keys(fetched.elementStyles) : null,
    })

    if (!fetched) return FALLBACK

    const elementStyles =
      fetched.elementStyles && typeof fetched.elementStyles === "object" && !Array.isArray(fetched.elementStyles)
        ? (fetched.elementStyles as AboutData['elementStyles'])
        : {}

    return {
      elementStyles,
    }
  } catch (e) {
    console.error("[loadAboutData]", e)
    return FALLBACK
  }
}