"use client"

import { useEffect, useState } from "react"

let cachedUrgency: string | null = null
let cachedUrgencyPromise: Promise<string | null> | null = null

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === "\"") {
      const next = line[i + 1]
      if (inQuotes && next === "\"") {
        current += "\""
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function buildUrgencyFromCsv(csv: string): string | null {
  const lines = csv.trim().split("\n")
  if (lines.length < 2) return null

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())
  const cityIndex = headers.indexOf("city")
  const dateIndex = headers.indexOf("date")

  if (cityIndex === -1 || dateIndex === -1) return null

  const rows = lines.slice(1).map(parseCsvLine)
  const futureShows = rows
    .map((row) => ({
      city: row[cityIndex] || "",
      date: row[dateIndex] || "",
    }))
    .filter((show) => show.date && new Date(show.date).getTime() >= startOfToday)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (!futureShows.length) return null

  const nextShow = futureShows[0]
  const formattedDate = new Date(nextShow.date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return `Next show: ${formattedDate} · ${nextShow.city}. Booking requests are open now.`
}

export function useCampaignUrgency(fallback: string) {
  const [urgency, setUrgency] = useState(fallback)

  useEffect(() => {
    if (cachedUrgency) {
      setUrgency(cachedUrgency)
      return
    }

    async function loadUrgency() {
      try {
        if (!cachedUrgencyPromise) {
          cachedUrgencyPromise = fetch("/data/concerts.csv")
            .then((response) => {
              if (!response.ok) throw new Error("Failed to load concerts CSV")
              return response.text()
            })
            .then((csv) => buildUrgencyFromCsv(csv))
            .catch(() => null)
        }

        const dynamicUrgency = (await cachedUrgencyPromise) || fallback
        cachedUrgency = dynamicUrgency
        setUrgency(dynamicUrgency)
      } catch {
        setUrgency(fallback)
      }
    }

    loadUrgency()
  }, [fallback])

  return urgency
}
