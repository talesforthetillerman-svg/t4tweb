import { readFile } from "node:fs/promises"
import path from "node:path"

export interface LiveConcert {
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

export async function loadLiveConcerts(): Promise<LiveConcert[]> {
  try {
    const csvPath = path.join(process.cwd(), "public", "data", "concerts.csv")
    const text = await readFile(csvPath, "utf8")
    const lines = text.trim().split("\n")
    if (lines.length <= 1) return []
    return lines
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
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  } catch (error) {
    console.error("[loadLiveConcerts]", error)
    return []
  }
}

