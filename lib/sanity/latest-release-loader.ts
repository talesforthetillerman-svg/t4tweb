import { createClient } from "next-sanity"
import { CAMPAIGN_CONTENT } from "@/components/campaign-content"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface LatestReleaseVideoSource {
  type: "youtube"
  url: string
  youtubeId: string
  enabled: boolean
  order: number
}

export interface LatestReleaseData {
  releaseTitle: string
  releaseSubtitle: string
  releaseCtaLabel: string
  releaseCtaHref: string
  showsCtaLabel: string
  showsCtaHref: string
  videoSources: LatestReleaseVideoSource[]
  elementStyles: Record<string, Record<string, unknown>>
}

const DEFAULT_VIDEO_SOURCE_URLS = [
  "https://www.youtube.com/watch?v=TfuHvz7pd24",
  "https://www.youtube.com/watch?v=xofflmVqYGs",
  "https://www.youtube.com/watch?v=Ss4kTzVQ-Bs",
]

const FALLBACK_VIDEO_SOURCES: LatestReleaseVideoSource[] = [
  { type: "youtube", url: DEFAULT_VIDEO_SOURCE_URLS[0], youtubeId: "TfuHvz7pd24", enabled: true, order: 1 },
  { type: "youtube", url: DEFAULT_VIDEO_SOURCE_URLS[1], youtubeId: "xofflmVqYGs", enabled: true, order: 2 },
  { type: "youtube", url: DEFAULT_VIDEO_SOURCE_URLS[2], youtubeId: "Ss4kTzVQ-Bs", enabled: true, order: 3 },
]

const FALLBACK: LatestReleaseData = {
  releaseTitle: CAMPAIGN_CONTENT.releaseTitle,
  releaseSubtitle: CAMPAIGN_CONTENT.releaseSubtitle,
  releaseCtaLabel: CAMPAIGN_CONTENT.releaseCtaLabel,
  releaseCtaHref: CAMPAIGN_CONTENT.releaseCtaHref,
  showsCtaLabel: CAMPAIGN_CONTENT.showsCtaLabel,
  showsCtaHref: CAMPAIGN_CONTENT.showsCtaHref,
  videoSources: FALLBACK_VIDEO_SOURCES,
  elementStyles: {},
}

function parseYouTubeId(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed) && !trimmed.includes("/")) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || ""
    const queryId = url.searchParams.get("v")
    if (queryId) return queryId
    const pathParts = url.pathname.split("/").filter(Boolean)
    if ((pathParts[0] === "embed" || pathParts[0] === "shorts" || pathParts[0] === "live") && pathParts[1]) {
      return pathParts[1]
    }
    const thumbnailMatch = /\/vi\/([^/?#]+)/.exec(url.pathname)
    if (thumbnailMatch?.[1]) return thumbnailMatch[1]
  } catch {
    return ""
  }
  return ""
}

function normalizeVideoSources(value: unknown, legacyYoutubeId?: string): LatestReleaseVideoSource[] {
  const sources = Array.isArray(value)
    ? value
    : legacyYoutubeId
      ? [{ type: "youtube", url: `https://www.youtube.com/watch?v=${legacyYoutubeId}`, youtubeId: legacyYoutubeId }]
      : []

  const normalized = sources
    .map((source) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) return null
      const entry = source as Record<string, unknown>
      const rawOrder = typeof entry.order === "number" ? entry.order : 999
      const url = typeof entry.url === "string" ? entry.url.trim() : ""
      const youtubeId = parseYouTubeId(url) || (typeof entry.youtubeId === "string" ? entry.youtubeId.trim() : "")
      if (!youtubeId || !url) return null
      return {
        type: "youtube" as const,
        url,
        youtubeId,
        enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
        order: Number.isFinite(rawOrder) ? rawOrder : 999,
      }
    })
    .filter((source): source is LatestReleaseVideoSource => source !== null)
    .sort((a, b) => a.order - b.order)
    .map((source, index) => ({ ...source, order: index + 1 }))
    .slice(0, 3)

  return normalized.length > 0 ? normalized : FALLBACK.videoSources
}

export async function loadLatestReleaseData(perspective: "published" | "drafts" = "published"): Promise<LatestReleaseData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective,
    })

    const fetched = await client.fetch<{
      title?: string
      subtitle?: string
      videoSources?: Array<{ type?: string; url?: string; youtubeId?: string; enabled?: boolean; order?: number }>
      ctaButtons?: Array<{ label?: string; href?: string }>
      elementStyles?: Record<string, Record<string, unknown>>
    } | null>(
      `*[_type == "latestRelease"][0]{
        title,
        subtitle,
        videoSources[]{ type, url, youtubeId, enabled, order },
        ctaButtons[]{ label, href },
        elementStyles
      }`
    )

    if (!fetched) return FALLBACK

    const primaryCta = fetched.ctaButtons?.[0]
    const showsCta = fetched.ctaButtons?.[1]

    return {
      releaseTitle: fetched.title || FALLBACK.releaseTitle,
      releaseSubtitle: fetched.subtitle || FALLBACK.releaseSubtitle,
      releaseCtaLabel: primaryCta?.label || FALLBACK.releaseCtaLabel,
      releaseCtaHref: primaryCta?.href || FALLBACK.releaseCtaHref,
      showsCtaLabel: showsCta?.label || FALLBACK.showsCtaLabel,
      showsCtaHref: showsCta?.href || FALLBACK.showsCtaHref,
      videoSources: normalizeVideoSources(fetched.videoSources),
      elementStyles:
        fetched.elementStyles && typeof fetched.elementStyles === "object" && !Array.isArray(fetched.elementStyles)
          ? fetched.elementStyles
          : FALLBACK.elementStyles,
    }
  } catch (e) {
    console.error("[loadLatestReleaseData]", e)
    return FALLBACK
  }
}
