import { createClient } from 'next-sanity'
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

/**
 * Server-side hero data loader.
 * Fetches hero section from Sanity in the server, avoiding race conditions
 * and ensuring deploy->public updates are visible immediately.
 */

interface HeroTitleSegment {
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  opacity?: number
  fontSize?: string
  fontFamily?: string
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
}

export interface HeroData {
  title: string
  titleHighlight: string
  titleSegments: HeroTitleSegment[]
  subtitle: string
  description: string
  logoUrl: string
  bgUrl: string
  scrollLabel: string
  ctaButtons: Array<{ label: string; href: string; variant: string }>
  elementStyles?: Record<string, Record<string, unknown>> // style overrides by targetId
}

const FALLBACK: HeroData = {
  title: "A vibrant blend of",
  titleHighlight: "funk, soul and world music",
  titleSegments: [
    { text: "A vibrant blend of", color: "#ffffff", bold: true, italic: false, underline: false, opacity: 1 },
    { text: "funk, soul and world music", color: "#FF8C21", bold: true, italic: false, underline: false, opacity: 1, gradientEnabled: true, gradientStart: "#FFB15A", gradientEnd: "#FF6C00" },
  ],
  subtitle: "BERLIN-BASED LIVE COLLECTIVE",
  description: "",
  logoUrl: "/images/t4tPics/logo-white.png",
  bgUrl: "/images/t4tPics/hero-bg.jpg",
  scrollLabel: "SCROLL",
  ctaButtons: [],
  elementStyles: {},
}

export async function loadHeroData(): Promise<HeroData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: '2024-01-01',
      // API origin by default so post-deploy reads match what we wrote (opt into CDN with SANITY_USE_CDN=true).
      useCdn: process.env.SANITY_USE_CDN === 'true',
      perspective: 'published',
    })

    const query = `*[_type == "heroSection"][0]{
      title,
      titleHighlight,
      titleSegments[]{
        text,
        color,
        bold,
        italic,
        underline,
        opacity,
        fontSize,
        fontFamily,
        gradientEnabled,
        gradientStart,
        gradientEnd
      },
      subtitle,
      description,
      scrollLabel,
      ctaButtons[]{
        label,
        href,
        variant
      },
      "logoUrl": logo.asset->url,
      "bgUrl": backgroundImage.asset->url,
      elementStyles
    }`

    const fetched = await client.fetch<Partial<HeroData> | null>(query)

    // Validate critical fields
    if (!fetched || (!fetched.bgUrl && !fetched.title)) {
      return FALLBACK
    }

    // Ensure titleSegments is always an array; pass through elementStyles from CMS / visual deploy
    const elementStyles =
      fetched.elementStyles && typeof fetched.elementStyles === 'object' && !Array.isArray(fetched.elementStyles)
        ? (fetched.elementStyles as HeroData['elementStyles'])
        : undefined

    return {
      title: fetched.title || FALLBACK.title,
      titleHighlight: fetched.titleHighlight || FALLBACK.titleHighlight,
      titleSegments: Array.isArray(fetched.titleSegments) && fetched.titleSegments.length > 0
        ? fetched.titleSegments
        : FALLBACK.titleSegments,
      subtitle: fetched.subtitle || FALLBACK.subtitle,
      description: fetched.description || FALLBACK.description,
      logoUrl: fetched.logoUrl || FALLBACK.logoUrl,
      bgUrl: fetched.bgUrl || FALLBACK.bgUrl,
      scrollLabel: fetched.scrollLabel ?? FALLBACK.scrollLabel,
      ctaButtons: Array.isArray(fetched.ctaButtons) ? fetched.ctaButtons : FALLBACK.ctaButtons,
      elementStyles: elementStyles ?? FALLBACK.elementStyles,
    }
  } catch (error) {
    console.error('[loadHeroData] failed to fetch from Sanity:', error)
    return FALLBACK
  }
}
