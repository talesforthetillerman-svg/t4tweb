import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface BandMemberData {
  id: number
  fullName: string
  role: string
  image: string
}

export interface BandMembersLoadResult {
  members: BandMemberData[]
  backgroundImageUrl: string
  headerEyebrow: string
  headerTitle: string
  headerDescription: string
  elementStyles?: Record<string, Record<string, unknown>>
}

const DEFAULT_BAND_BACKGROUND = "/images/sections/band-section.jpg"
const DEFAULT_BAND_HEADER_EYEBROW = "The Musicians"
const DEFAULT_BAND_HEADER_TITLE = "Meet the Band"
const DEFAULT_BAND_HEADER_DESCRIPTION = "Five musicians from diverse backgrounds, united by a passion for rhythm and groove."

const FALLBACK_MEMBERS: BandMemberData[] = [
  { id: 1, fullName: "Janosch Puhe", role: "Main Vocals", image: "/images/members/Janosch Puhe2.JPG" },
  { id: 2, fullName: "J.Ma Garcia Lopez", role: "Keys and Synth", image: "/images/members/J.Ma Garcia Lopez2.JPG" },
  { id: 3, fullName: "Otto Lorenz Contreras", role: "Drums", image: "/images/members/Otto Lorenz Contreras.JPG" },
  { id: 4, fullName: "Robii Crowford", role: "Electric Guitar", image: "/images/members/Robii Crowford.JPG" },
  { id: 5, fullName: "Tarik Benatmane", role: "Electric Bass", image: "/images/members/Tarik Benatmane.JPG" },
]

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
    if (key === "geometry") continue
    normalized[key] = entryValue
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

export async function loadBandMembersData(
  perspective: "published" | "drafts" = "published"
): Promise<BandMembersLoadResult> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: false,
      perspective: perspective,
    })

    // Load band members
    const query = `*[_type == "bandMember"] | order(order asc){
      fullName,
      role,
      "imageUrl": portraitImage.asset->url
    }`
    const fetched = await client.fetch<Array<{ fullName?: string; role?: string; imageUrl?: string }> | null>(query)

    const members =
      !Array.isArray(fetched) || fetched.length === 0
        ? FALLBACK_MEMBERS
        : fetched.map((member, index) => ({
            id: index + 1,
            fullName: member.fullName?.trim() || FALLBACK_MEMBERS[index]?.fullName || `Member ${index + 1}`,
            role: member.role?.trim() || FALLBACK_MEMBERS[index]?.role || "Musician",
            image: member.imageUrl || FALLBACK_MEMBERS[index]?.image || FALLBACK_MEMBERS[0].image,
          }))

    // Load band members settings (styles/layout materialized from editor)
    const settingsQuery = `*[_type == "bandMembersSettings"][0]{
      elementStyles,
      headerEyebrow,
      headerTitle,
      headerDescription,
      "backgroundImageUrl": backgroundImage.asset->url
    }`
    const settings = await client.fetch<{
      elementStyles?: unknown
      headerEyebrow?: string
      headerTitle?: string
      headerDescription?: string
      backgroundImageUrl?: string
    } | null>(settingsQuery)
    const elementStyles = parseElementStyles(settings?.elementStyles)

    return {
      members,
      backgroundImageUrl: settings?.backgroundImageUrl || DEFAULT_BAND_BACKGROUND,
      headerEyebrow: settings?.headerEyebrow?.trim() || DEFAULT_BAND_HEADER_EYEBROW,
      headerTitle: settings?.headerTitle?.trim() || DEFAULT_BAND_HEADER_TITLE,
      headerDescription: settings?.headerDescription?.trim() || DEFAULT_BAND_HEADER_DESCRIPTION,
      elementStyles,
    }
  } catch (error) {
    console.error("[loadBandMembersData]", error)
    return {
      members: FALLBACK_MEMBERS,
      backgroundImageUrl: DEFAULT_BAND_BACKGROUND,
      headerEyebrow: DEFAULT_BAND_HEADER_EYEBROW,
      headerTitle: DEFAULT_BAND_HEADER_TITLE,
      headerDescription: DEFAULT_BAND_HEADER_DESCRIPTION,
      elementStyles: {},
    }
  }
}
