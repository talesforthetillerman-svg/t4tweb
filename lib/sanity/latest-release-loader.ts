import { createClient } from "next-sanity"
import { CAMPAIGN_CONTENT } from "@/components/campaign-content"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface LatestReleaseData {
  releaseTitle: string
  releaseSubtitle: string
  releaseCtaLabel: string
  releaseCtaHref: string
  showsCtaLabel: string
  showsCtaHref: string
  youtubeId: string
  elementStyles: Record<string, Record<string, unknown>>
}

const FALLBACK: LatestReleaseData = {
  releaseTitle: CAMPAIGN_CONTENT.releaseTitle,
  releaseSubtitle: CAMPAIGN_CONTENT.releaseSubtitle,
  releaseCtaLabel: CAMPAIGN_CONTENT.releaseCtaLabel,
  releaseCtaHref: CAMPAIGN_CONTENT.releaseCtaHref,
  showsCtaLabel: CAMPAIGN_CONTENT.showsCtaLabel,
  showsCtaHref: CAMPAIGN_CONTENT.showsCtaHref,
  youtubeId: "xofflmVqYGs",
  elementStyles: {},
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
      youtubeId?: string
      ctaButtons?: Array<{ label?: string; href?: string }>
      elementStyles?: Record<string, Record<string, unknown>>
    } | null>(
      `*[_type == "latestRelease"][0]{
        title,
        subtitle,
        youtubeId,
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
      youtubeId: fetched.youtubeId || FALLBACK.youtubeId,
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
