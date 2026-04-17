import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface FooterLinkData {
  id: string
  name: string
  href: string
}

export interface FooterData {
  logoUrl: string
  logoAlt: string
  description: string
  ctaLabel: string
  ctaHref: string
  copyright: string
  socialLinks: FooterLinkData[]
  elementStyles: Record<string, Record<string, unknown>>
}

const DEFAULT_LOGO_URL = "/images/t4tPics/logo-white.png"

const FALLBACK_FOOTER: FooterData = {
  logoUrl: DEFAULT_LOGO_URL,
  logoAlt: "Tales for the Tillerman",
  description: "Tales for the Tillerman is a Berlin-based collective blending world music, funk, soul, and reggae. Join us on social media and streaming platforms.",
  ctaLabel: "Book the Band",
  ctaHref: "https://www.bandsintown.com/e/108124718-tales-for-the-tillerman-at-mauerpark?came_from=250&utm_medium=web&utm_source=artist_page&utm_campaign=search_bar",
  copyright: "2025 Tales for the Tillerman. All rights reserved.",
  socialLinks: [
    { id: "footer-social-instagram", name: "Instagram", href: "https://www.instagram.com/tales4tillerman" },
    { id: "footer-social-youtube", name: "YouTube", href: "https://www.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ" },
    { id: "footer-social-telegram", name: "Telegram", href: "https://t.me/talesforthetillerman" },
    { id: "footer-social-linktree", name: "Linktree", href: "https://linktr.ee/tales4tillerman" },
  ],
  elementStyles: {},
}

function normalizeElementStyleEntry(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const geometry = raw.geometry && typeof raw.geometry === "object" && !Array.isArray(raw.geometry)
    ? raw.geometry as Record<string, unknown>
    : null
  const normalized: Record<string, unknown> = {}

  if (geometry) {
    for (const key of ["x", "y", "width", "height"]) {
      if (typeof geometry[key] === "number") normalized[key] = Math.round(geometry[key] as number)
    }
  }

  for (const [key, entryValue] of Object.entries(raw)) {
    if (key !== "geometry") normalized[key] = entryValue
  }

  return normalized
}

function parseElementStyles(value: unknown): Record<string, Record<string, unknown>> {
  const parsed = typeof value === "string"
    ? (() => {
        try {
          return JSON.parse(value) as unknown
        } catch {
          return null
        }
      })()
    : value

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

  const result: Record<string, Record<string, unknown>> = {}
  for (const [nodeId, styleValue] of Object.entries(parsed as Record<string, unknown>)) {
    const style = normalizeElementStyleEntry(styleValue)
    if (style) result[nodeId] = style
  }
  return result
}

function mergeSocialLink(fallback: FooterLinkData, incoming: Partial<FooterLinkData> | undefined): FooterLinkData {
  return {
    id: incoming?.id?.trim() || fallback.id,
    name: incoming?.name?.trim() || fallback.name,
    href: incoming?.href?.trim() || fallback.href,
  }
}

export async function loadFooterData(perspective: "published" | "drafts" = "published"): Promise<FooterData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective,
    })

    const fetched = await client.fetch<{
      logoUrl?: string
      logoAlt?: string
      description?: string
      ctaLabel?: string
      ctaHref?: string
      copyright?: string
      socialLinks?: Array<Partial<FooterLinkData>>
      elementStyles?: unknown
    } | null>(
      `*[_type == "footerSection"][0]{
        "logoUrl": logo.asset->url,
        logoAlt,
        description,
        ctaLabel,
        ctaHref,
        copyright,
        socialLinks[]{ id, name, href },
        elementStyles
      }`
    )

    if (!fetched) return FALLBACK_FOOTER

    const socialLinks = FALLBACK_FOOTER.socialLinks.map((fallback, index) =>
      mergeSocialLink(fallback, fetched.socialLinks?.[index])
    )

    return {
      logoUrl: fetched.logoUrl || FALLBACK_FOOTER.logoUrl,
      logoAlt: fetched.logoAlt?.trim() || FALLBACK_FOOTER.logoAlt,
      description: fetched.description?.trim() || FALLBACK_FOOTER.description,
      ctaLabel: fetched.ctaLabel?.trim() || FALLBACK_FOOTER.ctaLabel,
      ctaHref: fetched.ctaHref?.trim() || FALLBACK_FOOTER.ctaHref,
      copyright: fetched.copyright?.trim() || FALLBACK_FOOTER.copyright,
      socialLinks,
      elementStyles: parseElementStyles(fetched.elementStyles),
    }
  } catch (error) {
    console.error("[loadFooterData]", error)
    return FALLBACK_FOOTER
  }
}
