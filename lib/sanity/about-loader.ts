import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface AboutData {
  eyebrow: string
  title: string
  bioParagraphs: string[]
  bioTagline: string
  copyButtonLabel: string
  backgroundImageUrl: string
  elementStyles: Record<string, Record<string, unknown>>
}

export const ABOUT_FALLBACK: AboutData = {
  eyebrow: "About the Band",
  title: "A Journey Through Sound",
  bioParagraphs: [
    "Tales for the Tillerman is a Berlin-based collective blending funk, soul, reggae, and global grooves into a powerful live experience. With rich arrangements, strong vocals, and an organic band sound, the project brings together musicians from different backgrounds into one vibrant and emotional journey.",
    "From intimate cultural spaces to lively festivals and club stages, the band delivers concerts full of energy, depth, and connection. Their sound moves between uplifting rhythms, warm melodies, and danceable momentum — always with a human touch and a strong live identity.",
  ],
  bioTagline: "5 musicians • Berlin-based • World music fusion • Live experience",
  copyButtonLabel: "Copy band bio",
  backgroundImageUrl: "/images/about-bg-main.jpg",
  elementStyles: {},
}

function normalizeAboutBioParagraphs(value: unknown): string[] {
  const incoming = Array.isArray(value) ? value : []
  return ABOUT_FALLBACK.bioParagraphs.map((fallbackParagraph, index) => {
    const paragraph = incoming[index]
    return isUsableAboutCopy(paragraph) && !isLegacyAboutParagraph(paragraph) ? paragraph.trim() : fallbackParagraph
  })
}

function normalizeAboutElementStyles(value: unknown): AboutData["elementStyles"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const next = { ...(value as AboutData["elementStyles"]) }
  delete next["about-photo-scrim"]
  return next
}

function isLegacyAboutParagraph(value: string): boolean {
  return (
    value.includes("world music, funk, soul, and reggae") ||
    value.includes("five musicians into one fluid, dynamic live act")
  )
}

function isUsableAboutCopy(value: unknown): value is string {
  if (typeof value !== "string") return false
  const text = value.trim()
  if (!text) return false
  return !/\b(?:missing|placeholder|test|testing|lorem|ipsum|dummy|sample|routing check|full-path validation)\b/i.test(text)
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
      eyebrow,
      title,
      bioParagraphs,
      bioTagline,
      copyButtonLabel,
      "backgroundImageUrl": backgroundImage.asset->url,
      elementStyles
    }`

    const fetched = await client.fetch<Partial<AboutData> | null>(query)

    if (!fetched) return ABOUT_FALLBACK

    const elementStyles = normalizeAboutElementStyles(fetched.elementStyles)

    return {
      eyebrow: isUsableAboutCopy(fetched.eyebrow) ? fetched.eyebrow.trim() : ABOUT_FALLBACK.eyebrow,
      title: isUsableAboutCopy(fetched.title) ? fetched.title.trim() : ABOUT_FALLBACK.title,
      bioParagraphs: normalizeAboutBioParagraphs(fetched.bioParagraphs),
      bioTagline: isUsableAboutCopy(fetched.bioTagline) ? fetched.bioTagline.trim() : ABOUT_FALLBACK.bioTagline,
      copyButtonLabel: isUsableAboutCopy(fetched.copyButtonLabel) ? fetched.copyButtonLabel.trim() : ABOUT_FALLBACK.copyButtonLabel,
      backgroundImageUrl: typeof fetched.backgroundImageUrl === "string" && fetched.backgroundImageUrl.trim() ? fetched.backgroundImageUrl : ABOUT_FALLBACK.backgroundImageUrl,
      elementStyles,
    }
  } catch (e) {
    console.error("[loadAboutData]", e)
    return ABOUT_FALLBACK
  }
}
