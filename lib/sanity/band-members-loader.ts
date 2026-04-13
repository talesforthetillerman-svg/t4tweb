import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface BandMemberData {
  id: number
  fullName: string
  role: string
  image: string
}

const FALLBACK_MEMBERS: BandMemberData[] = [
  { id: 1, fullName: "Janosch Puhe", role: "Main Vocals", image: "/images/members/Janosch Puhe2.JPG" },
  { id: 2, fullName: "J.Ma Garcia Lopez", role: "Keys and Synth", image: "/images/members/J.Ma Garcia Lopez2.JPG" },
  { id: 3, fullName: "Otto Lorenz Contreras", role: "Drums", image: "/images/members/Otto Lorenz Contreras.JPG" },
  { id: 4, fullName: "Robii Crowford", role: "Electric Guitar", image: "/images/members/Robii Crowford.JPG" },
  { id: 5, fullName: "Tarik Benatmane", role: "Electric Bass", image: "/images/members/Tarik Benatmane.JPG" },
]

export async function loadBandMembersData(perspective: "published" | "previewDrafts" = "published"): Promise<BandMemberData[]> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective: perspective,
    })
    const query = `*[_type == "bandMember"] | order(order asc){
      fullName,
      role,
      "imageUrl": portraitImage.asset->url
    }`
    const fetched = await client.fetch<Array<{ fullName?: string; role?: string; imageUrl?: string }> | null>(query)
    if (!Array.isArray(fetched) || fetched.length === 0) return FALLBACK_MEMBERS
    return fetched.map((member, index) => ({
      id: index + 1,
      fullName: member.fullName?.trim() || FALLBACK_MEMBERS[index]?.fullName || `Member ${index + 1}`,
      role: member.role?.trim() || FALLBACK_MEMBERS[index]?.role || "Musician",
      image: member.imageUrl || FALLBACK_MEMBERS[index]?.image || FALLBACK_MEMBERS[0].image,
    }))
  } catch (error) {
    console.error("[loadBandMembersData]", error)
    return FALLBACK_MEMBERS
  }
}

