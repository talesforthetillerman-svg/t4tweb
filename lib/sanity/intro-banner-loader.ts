import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface IntroBannerData {
  bannerText: string
  gifUrl: string
  bookLabel: string
  bookHref: string
  pressLabel: string
  pressHref: string
  elementStyles: Record<string, Record<string, unknown>>
}

/** Default GIF path (matches previous hardcoded asset). */
export const DEFAULT_INTRO_GIF_URL = "/images/t4tPics/banner-crop-ezgif.com-gif-maker.gif"

const FALLBACK: IntroBannerData = {
  bannerText:
    "Tales for the Tillerman brings groove-driven live energy to festivals, clubs and special events — with a warm, rhythmic sound made to move a room.",
  gifUrl: DEFAULT_INTRO_GIF_URL,
  bookLabel: "Book the Band",
  bookHref: "#contact",
  pressLabel: "View Press Kit",
  pressHref: "#press-kit",
  elementStyles: {},
}

export async function loadIntroBannerData(perspective: "published" | "previewDrafts" = "published"): Promise<IntroBannerData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective: perspective,
    })

    const query = `*[_type == "introBanner"][0]{
      bannerText,
      gifUrl,
      bookLabel,
      bookHref,
      pressLabel,
      pressHref,
      elementStyles
    }`

    const fetched = await client.fetch<Partial<IntroBannerData> | null>(query)

    if (!fetched) return FALLBACK

    const elementStyles =
      fetched.elementStyles && typeof fetched.elementStyles === "object" && !Array.isArray(fetched.elementStyles)
        ? (fetched.elementStyles as IntroBannerData["elementStyles"])
        : {}

    return {
      bannerText: (typeof fetched.bannerText === "string" && fetched.bannerText.trim()) ? fetched.bannerText.trim() : FALLBACK.bannerText,
      gifUrl: (typeof fetched.gifUrl === "string" && fetched.gifUrl.trim()) ? fetched.gifUrl.trim() : FALLBACK.gifUrl,
      bookLabel: fetched.bookLabel?.trim() || FALLBACK.bookLabel,
      bookHref: fetched.bookHref?.trim() || FALLBACK.bookHref,
      pressLabel: fetched.pressLabel?.trim() || FALLBACK.pressLabel,
      pressHref: fetched.pressHref?.trim() || FALLBACK.pressHref,
      elementStyles,
    }
  } catch (e) {
    console.error("[loadIntroBannerData]", e)
    return FALLBACK
  }
}
