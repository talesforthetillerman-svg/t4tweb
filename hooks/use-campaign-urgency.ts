"use client"

import { useEffect, useState } from "react"

let cachedUrgency: string | null = null
let cachedUrgencyPromise: Promise<string | null> | null = null

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

function buildUrgencyFromConcerts(concerts: Concert[]): string | null {
  if (!concerts.length) return null

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const futureShows = concerts
    .map((show) => ({
      venue: show.venue || "",
      city: show.city || "",
      date: show.date || "",
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
  const [urgency, setUrgency] = useState(() => cachedUrgency || fallback)

  useEffect(() => {
    if (cachedUrgency) {
      return
    }

    async function loadUrgency() {
      try {
        if (!cachedUrgencyPromise) {
          cachedUrgencyPromise = fetch("/api/concerts")
            .then((response) => {
              if (!response.ok) throw new Error("Failed to load concerts")
              return response.json() as Promise<Concert[]>
            })
            .then((concerts) => buildUrgencyFromConcerts(concerts))
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
