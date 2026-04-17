import { readFile } from "node:fs/promises"
import path from "node:path"
import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface LiveConcert {
  _editorId: number
  venue: string
  city: string
  country: string
  date: string
  time: string
  status: string
  genre: string
  capacity: string
  price: string
  locationUrl: string
}

export interface LiveSectionData {
  concerts: LiveConcert[]
  elementStyles: Record<string, Record<string, unknown>>
  backgroundImageUrl: string
}

const DEFAULT_LIVE_BACKGROUND = "/images/sections/live-bg.jpg"

async function loadCsvConcerts(): Promise<LiveConcert[]> {
  try {
    const csvPath = path.join(process.cwd(), "public", "data", "concerts.csv")
    const text = await readFile(csvPath, "utf8")
    const lines = text.trim().split("\n")
    if (lines.length <= 1) return []
    const concerts = lines
      .slice(1)
      .map((line) => {
        const values = line.split(",")
        return {
          venue: values[0] || "",
          city: values[1] || "",
          country: values[2] || "",
          date: values[3] || "",
          time: values[4] || "",
          status: values[5] || "",
          genre: values[6] || "",
          capacity: values[7] || "",
          price: values[8] || "Free",
          locationUrl: values[9] || "",
        } satisfies Omit<LiveConcert, "_editorId">
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return concerts.map((concert, index) => ({ ...concert, _editorId: index }))
  } catch (error) {
    console.error("[loadLiveConcerts]", error)
    return []
  }
}

function normalizePrice(value: unknown): string {
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value
  return "Free"
}

export async function loadLiveSectionData(perspective: "published" | "drafts" = "published"): Promise<LiveSectionData> {
  const csvConcerts = await loadCsvConcerts()
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: process.env.SANITY_USE_CDN === "true",
      perspective,
    })
    const [settings, sanityConcerts] = await Promise.all([
      client.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        backgroundImageUrl?: string
      } | null>(
        `*[_type == "liveSection"][0]{
          elementStyles,
          "backgroundImageUrl": backgroundImage.asset->url
        }`
      ),
      client.fetch<Array<{
        editorId?: number
        venue?: string
        city?: string
        country?: string
        date?: string
        time?: string
        status?: string
        genre?: string
        capacity?: string
        price?: unknown
        ticketUrl?: string
      }>>(
        `*[_type == "concert"] | order(date asc){
          editorId,
          venue,
          city,
          country,
          date,
          time,
          status,
          genre,
          capacity,
          price,
          ticketUrl
        }`
      ),
    ])

    const byEditorId = new Map<number, LiveConcert>()
    csvConcerts.forEach((concert) => byEditorId.set(concert._editorId, concert))

    const extraConcerts: LiveConcert[] = []
    sanityConcerts.forEach((concert, index) => {
      const editorId = typeof concert.editorId === "number" ? concert.editorId : csvConcerts.length + index
      const base = byEditorId.get(editorId)
      const merged: LiveConcert = {
        _editorId: editorId,
        venue: concert.venue || base?.venue || "",
        city: concert.city || base?.city || "",
        country: concert.country || base?.country || "",
        date: concert.date || base?.date || "",
        time: concert.time || base?.time || "",
        status: concert.status || base?.status || "Upcoming",
        genre: concert.genre || base?.genre || "",
        capacity: concert.capacity || base?.capacity || "",
        price: normalizePrice(concert.price ?? base?.price),
        locationUrl: concert.ticketUrl || base?.locationUrl || "",
      }
      if (byEditorId.has(editorId)) {
        byEditorId.set(editorId, merged)
      } else {
        extraConcerts.push(merged)
      }
    })

    const concerts = [...Array.from(byEditorId.values()), ...extraConcerts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return {
      concerts,
      elementStyles:
        settings?.elementStyles && typeof settings.elementStyles === "object" && !Array.isArray(settings.elementStyles)
          ? settings.elementStyles
          : {},
      backgroundImageUrl: settings?.backgroundImageUrl || DEFAULT_LIVE_BACKGROUND,
    }
  } catch (error) {
    console.error("[loadLiveSectionData]", error)
    return {
      concerts: csvConcerts,
      elementStyles: {},
      backgroundImageUrl: DEFAULT_LIVE_BACKGROUND,
    }
  }
}

export async function loadLiveConcerts(): Promise<LiveConcert[]> {
  const data = await loadLiveSectionData()
  return data.concerts
}
