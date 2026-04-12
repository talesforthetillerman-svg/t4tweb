import { createClient } from 'next-sanity'
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

/**
 * Server-side hero data loader.
 * Fetches hero section from Sanity in the server, avoiding race conditions
 * and ensuring deploy->public updates are visible immediately.
 */

export interface HeroData {
  title: string
  titleHighlight: string
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

    // Pass through elementStyles from CMS / visual deploy
    const elementStyles =
      fetched.elementStyles && typeof fetched.elementStyles === 'object' && !Array.isArray(fetched.elementStyles)
        ? (fetched.elementStyles as HeroData['elementStyles'])
        : undefined

    return {
      title: fetched.title || FALLBACK.title,
      titleHighlight: fetched.titleHighlight || FALLBACK.titleHighlight,
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
