import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface ContactMethodData {
  title: string
  description: string
  href: string
  label: string
  contactName?: string
}

export interface ContactSectionData {
  eyebrow: string
  title: string
  description: string
  middleText: string
  backgroundImageUrl: string
  contactMethods: [ContactMethodData, ContactMethodData]
  elementStyles: Record<string, Record<string, unknown>>
}

const DEFAULT_CONTACT_BACKGROUND = "/images/sections/contact-bg.jpg"

const FALLBACK_CONTACT_DATA: ContactSectionData = {
  eyebrow: "Contact",
  title: "Get in Touch",
  description: "Get in touch for booking inquiries and event collaborations.",
  middleText: "or",
  backgroundImageUrl: DEFAULT_CONTACT_BACKGROUND,
  contactMethods: [
    {
      title: "Email Us",
      description: "For booking inquiries Momo Garcia - Band Management",
      href: "mailto:talesforthetillerman@gmail.com",
      label: "talesforthetillerman@gmail.com",
      contactName: "Momo Garcia",
    },
    {
      title: "Telegram",
      description: "Janosch Puhe - Quick response for urgent matters",
      href: "https://t.me/Janoschpuhe",
      label: "@Janoschpuhe +4916090615287",
      contactName: "Janosch Puhe",
    },
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

function mergeMethod(fallback: ContactMethodData, incoming: Partial<ContactMethodData> | undefined): ContactMethodData {
  return {
    title: incoming?.title?.trim() || fallback.title,
    description: incoming?.description?.trim() || fallback.description,
    href: incoming?.href?.trim() || fallback.href,
    label: incoming?.label?.trim() || fallback.label,
    contactName: incoming?.contactName?.trim() || fallback.contactName,
  }
}

export async function loadContactSectionData(
  perspective: "published" | "drafts" = "published"
): Promise<ContactSectionData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective,
    })

    const fetched = await client.fetch<{
      eyebrow?: string
      title?: string
      description?: string
      middleText?: string
      backgroundImageUrl?: string
      contactMethods?: Array<Partial<ContactMethodData>>
      elementStyles?: unknown
    } | null>(
      `*[_type == "contactSection"][0]{
        eyebrow,
        title,
        description,
        middleText,
        contactMethods[]{ title, description, href, label, contactName },
        "backgroundImageUrl": backgroundImage.asset->url,
        elementStyles
      }`
    )

    if (!fetched) return FALLBACK_CONTACT_DATA

    return {
      eyebrow: fetched.eyebrow?.trim() || FALLBACK_CONTACT_DATA.eyebrow,
      title: fetched.title?.trim() || FALLBACK_CONTACT_DATA.title,
      description: fetched.description?.trim() || FALLBACK_CONTACT_DATA.description,
      middleText: fetched.middleText?.trim() || FALLBACK_CONTACT_DATA.middleText,
      backgroundImageUrl: fetched.backgroundImageUrl || FALLBACK_CONTACT_DATA.backgroundImageUrl,
      contactMethods: [
        mergeMethod(FALLBACK_CONTACT_DATA.contactMethods[0], fetched.contactMethods?.[0]),
        mergeMethod(FALLBACK_CONTACT_DATA.contactMethods[1], fetched.contactMethods?.[1]),
      ],
      elementStyles: parseElementStyles(fetched.elementStyles),
    }
  } catch (error) {
    console.error("[loadContactSectionData]", error)
    return FALLBACK_CONTACT_DATA
  }
}
