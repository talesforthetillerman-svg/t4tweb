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
  elementStyles?: Record<string, Record<string, unknown>>
}

const FALLBACK_MEMBERS: BandMemberData[] = [
  { id: 1, fullName: "Janosch Puhe", role: "Main Vocals", image: "/images/members/Janosch Puhe2.JPG" },
  { id: 2, fullName: "J.Ma Garcia Lopez", role: "Keys and Synth", image: "/images/members/J.Ma Garcia Lopez2.JPG" },
  { id: 3, fullName: "Otto Lorenz Contreras", role: "Drums", image: "/images/members/Otto Lorenz Contreras.JPG" },
  { id: 4, fullName: "Robii Crowford", role: "Electric Guitar", image: "/images/members/Robii Crowford.JPG" },
  { id: 5, fullName: "Tarik Benatmane", role: "Electric Bass", image: "/images/members/Tarik Benatmane.JPG" },
]

export async function loadBandMembersData(
  perspective: "published" | "drafts" = "published"
): Promise<BandMembersLoadResult> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
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
      elementStyles
    }`
    const settings = await client.fetch<{ elementStyles?: any } | null>(settingsQuery)
    
    let elementStyles = {}
    if (settings?.elementStyles) {
      if (typeof settings.elementStyles === 'string') {
        try {
          elementStyles = JSON.parse(settings.elementStyles)
        } catch (e) {
          console.error("[loadBandMembersData] Failed to parse elementStyles JSON string:", e)
        }
      } else if (typeof settings.elementStyles === 'object' && settings.elementStyles !== null) {
        // Already an object (legacy data or schema mismatch)
        elementStyles = settings.elementStyles
      }
    }

    return {
      members,
      elementStyles,
    }
  } catch (error) {
    console.error("[loadBandMembersData]", error)
    return {
      members: FALLBACK_MEMBERS,
      elementStyles: {},
    }
  }
}

