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

export const MANUAL_LIVE_CONCERTS: LiveConcert[] = [
  {
    _editorId: 0,
    venue: "Mauerpark",
    city: "",
    country: "",
    date: "2026-12-01",
    time: "",
    status: "Upcoming",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 1,
    venue: "Zuckerzauber",
    city: "",
    country: "",
    date: "2026-12-02",
    time: "",
    status: "Upcoming",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 2,
    venue: "Werk 9",
    city: "",
    country: "",
    date: "2025-01-01",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 3,
    venue: "ART Stalker",
    city: "",
    country: "",
    date: "2025-01-02",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 4,
    venue: "Horns Erben",
    city: "",
    country: "",
    date: "2025-01-03",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 5,
    venue: "KAOS",
    city: "",
    country: "",
    date: "2025-01-04",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 6,
    venue: "Zuckerzauber",
    city: "",
    country: "",
    date: "2025-01-05",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 7,
    venue: "Kulturelle Landapie",
    city: "",
    country: "",
    date: "2025-01-06",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 8,
    venue: "Sommersonnenwende Festival",
    city: "",
    country: "",
    date: "2025-01-07",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 9,
    venue: "Mauerpark",
    city: "",
    country: "",
    date: "2025-01-08",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 10,
    venue: "Privatclub",
    city: "",
    country: "",
    date: "2025-01-09",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 11,
    venue: "Uebel & Gefährlich",
    city: "",
    country: "",
    date: "2025-01-10",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 12,
    venue: "Schnabeltierfestival",
    city: "",
    country: "",
    date: "2025-01-11",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
  {
    _editorId: 13,
    venue: "Waltweiser Festival",
    city: "",
    country: "",
    date: "2025-01-12",
    time: "",
    status: "Completed",
    genre: "World Music",
    capacity: "",
    price: "",
    locationUrl: "",
  },
]

function normalizePrice(value: unknown): string {
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value
  return ""
}

function normalizeConcert(
  concert: {
    editorId?: number
    venue?: string
    locationName?: string
    city?: string
    country?: string
    date?: string
    time?: string
    status?: string
    genre?: string
    style?: string
    capacity?: string
    price?: unknown
    priceText?: string
    ticketUrl?: string
    locationUrl?: string
    locationLink?: string
  },
  fallbackId: number
): LiveConcert {
  return {
    _editorId: typeof concert.editorId === "number" ? concert.editorId : fallbackId,
    venue: concert.venue || concert.locationName || "",
    city: concert.city || "",
    country: concert.country || "",
    date: concert.date || "",
    time: concert.time || "",
    status: concert.status || "Upcoming",
    genre: concert.genre || concert.style || "World Music",
    capacity: concert.capacity || "",
    price: normalizePrice(concert.price ?? concert.priceText),
    locationUrl: concert.locationUrl || concert.ticketUrl || concert.locationLink || "",
  }
}

export async function loadLiveSectionData(
  perspective: "published" | "drafts" = "published"
): Promise<LiveSectionData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: false,
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
      client.fetch<
        Array<{
          editorId?: number
          venue?: string
          locationName?: string
          city?: string
          country?: string
          date?: string
          time?: string
          status?: string
          genre?: string
          style?: string
          capacity?: string
          price?: unknown
          priceText?: string
          ticketUrl?: string
          locationUrl?: string
          locationLink?: string
        }>
      >(
        `*[_type == "concert"] | order(date asc){
          editorId,
          venue,
          locationName,
          city,
          country,
          date,
          time,
          status,
          genre,
          style,
          capacity,
          price,
          priceText,
          ticketUrl,
          locationUrl,
          locationLink
        }`
      ),
    ])

    const concerts =
      Array.isArray(sanityConcerts) && sanityConcerts.length > 0
        ? sanityConcerts.map((concert, index) => normalizeConcert(concert, index))
        : [...MANUAL_LIVE_CONCERTS]

    return {
      concerts,
      elementStyles:
        settings?.elementStyles &&
        typeof settings.elementStyles === "object" &&
        !Array.isArray(settings.elementStyles)
          ? settings.elementStyles
          : {},
      backgroundImageUrl: settings?.backgroundImageUrl || DEFAULT_LIVE_BACKGROUND,
    }
  } catch (error) {
    console.error("[loadLiveSectionData]", error)
    return {
      concerts: [...MANUAL_LIVE_CONCERTS],
      elementStyles: {},
      backgroundImageUrl: DEFAULT_LIVE_BACKGROUND,
    }
  }
}

export async function loadLiveConcerts(): Promise<LiveConcert[]> {
  const data = await loadLiveSectionData()
  return data.concerts
}