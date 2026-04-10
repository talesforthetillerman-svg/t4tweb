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

export async function GET() {
  try {
    const localConcerts = await readLocalConcerts()
    return NextResponse.json(localConcerts)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
