"use client"

import { useEffect, useState } from "react"

let cachedUrgency: string | null = null
let cachedUrgencyPromise: Promise<string> | null = null

function buildUrgencyFromCsv(csv: string): string | null {
  const lines = csv.trim().split("\n")
  if (lines.length < 2) return null

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const rows = lines.slice(1).map((line) => line.split(","))
  const futureShows = rows
    .map((row) => ({
      venue: row[0] || "",
      city: row[1] || "",
      date: row[3] || "",
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
            .then((csv) => buildUrgencyFromCsv(csv) || fallback)
            .catch(() => fallback)
        }

        const dynamicUrgency = await cachedUrgencyPromise
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
