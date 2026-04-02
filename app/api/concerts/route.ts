import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

interface Concert {
  venue: string
  city: string
  country: string
  date: string
  time: string
  status: string
  genre: string
  capacity: string
  price: string
}

function parseCsv(csv: string): Concert[] {
  const lines = csv.trim().split("\n")
  return lines.slice(1).map((line) => {
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
      price: values[8] || "",
    }
  })
}

function sortConcerts(concerts: Concert[]): Concert[] {
  return concerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

async function readLocalConcerts(): Promise<Concert[]> {
  const csvPath = path.join(process.cwd(), "public", "data", "concerts.csv")
  const csv = await readFile(csvPath, "utf8")
  return sortConcerts(parseCsv(csv))
}

async function readSanityConcerts(): Promise<Concert[] | null> {
  const projectId = process.env.SANITY_PROJECT_ID?.trim()
  const dataset = process.env.SANITY_DATASET?.trim() || "production"
  const apiVersion = process.env.SANITY_API_VERSION?.trim() || "2024-01-01"

  if (!projectId) {
    return null
  }

  const query = '*[_type == "concert"] | order(date desc){ venue, city, country, date, time, status, genre, capacity, price }'
  const url = `https://${projectId}.apicdn.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}&returnQuery=false`

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { result?: Concert[] }
    if (!Array.isArray(data.result)) {
      return null
    }

    return sortConcerts(data.result)
  } catch {
    return null
  }
}

export async function GET() {
  const sanityConcerts = await readSanityConcerts()
  if (sanityConcerts) {
    return NextResponse.json(sanityConcerts)
  }

  try {
    const localConcerts = await readLocalConcerts()
    return NextResponse.json(localConcerts)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
