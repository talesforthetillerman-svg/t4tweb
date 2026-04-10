import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface NavigationData {
  brandName: string
  brandLogoUrl: string | null
  links: Array<{ label: string; href: string }>
  ctaLabel: string
  ctaHref: string
  elementStyles: Record<string, Record<string, unknown>>
}

/** Default nav links (editor-deploy merges text/href into Sanity `links` from this shape). */
export const DEFAULT_NAV_LINKS: NavigationData["links"] = [
  { href: "#about", label: "About" },
  { href: "#press-kit", label: "Press" },
  { href: "#band", label: "Band" },
  { href: "#live", label: "Live" },
  { href: "#contact", label: "Contact" },
]

const DEFAULT_LINKS = DEFAULT_NAV_LINKS

const FALLBACK: NavigationData = {
  brandName: "Tales for the Tillerman",
  brandLogoUrl: null,
  links: DEFAULT_LINKS,
  ctaLabel: "Book",
  ctaHref: "#contact",
  elementStyles: {},
}

export async function loadNavigationData(): Promise<NavigationData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective: "published",
    })

    const query = `*[_type == "navigation"][0]{
      brandName,
      "brandLogoUrl": brandLogo.asset->url,
      links[]{ label, href },
      ctaLabel,
      ctaHref,
      elementStyles
    }`

    const fetched = await client.fetch<Partial<NavigationData> | null>(query)

    if (!fetched) return FALLBACK

    const links =
      Array.isArray(fetched.links) && fetched.links.length > 0 ? fetched.links : FALLBACK.links

    const elementStyles =
      fetched.elementStyles && typeof fetched.elementStyles === "object" && !Array.isArray(fetched.elementStyles)
        ? (fetched.elementStyles as NavigationData["elementStyles"])
        : {}

    return {
      brandName: fetched.brandName || FALLBACK.brandName,
      brandLogoUrl: fetched.brandLogoUrl ?? FALLBACK.brandLogoUrl,
      links,
      ctaLabel: fetched.ctaLabel || FALLBACK.ctaLabel,
      ctaHref: fetched.ctaHref || FALLBACK.ctaHref,
      elementStyles,
    }
  } catch (e) {
    console.error("[loadNavigationData]", e)
    return FALLBACK
  }
}
