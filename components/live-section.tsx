"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

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

// Parse CSV data
function parseCSV(csv: string): Concert[] {
  const lines = csv.trim().split("\n")
  const headers = lines[0].split(",")
  
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

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function LiveSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1, rootMargin: "-50px" }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Fetch and parse CSV data
  useEffect(() => {
    async function fetchConcerts() {
      try {
        const response = await fetch("/data/concerts.csv")
        const csv = await response.text()
        const parsed = parseCSV(csv)
        // Sort by date, most recent first
        const sorted = parsed.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setConcerts(sorted)
      } catch (error) {
        console.error("Error loading concert data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchConcerts()
  }, [])

  const platforms = [
    {
      name: "Spotify",
      href: "https://open.spotify.com/intl-es/artist/0FHjK3O0k8HQMrJsF7KQwF",
      icon: SpotifyIcon,
      color: "hover:bg-[#1DB954]",
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ",
      icon: YouTubeIcon,
      color: "hover:bg-[#FF0000]",
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/tales4tillerman",
      icon: InstagramIcon,
      color: "hover:bg-[#E1306C]",
    },
  ]

  return (
    <section
      id="live"
      ref={sectionRef}
      className="relative py-28 md:py-40 bg-card"
    >
      {/* Background Image with subtle overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/images/DSC_4710.JPG"
          alt="Tales for the Tillerman live performance"
          fill
          className="object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-card via-card/95 to-card" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div
            className={`text-center mb-16 transition-all duration-700 ease-out ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
              Experience
            </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance">
            Our Show History
          </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From intimate club shows to festival main stages, Tales for the Tillerman 
              delivers an unforgettable live experience.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Concert List */}
            <div
              className={`lg:col-span-2 transition-all duration-700 delay-200 ease-out ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-16"
              }`}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground">Loading concerts...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {concerts.map((concert, index) => (
                    <div
                      key={index}
                      className="p-5 bg-secondary/50 rounded-xl border border-border hover:border-primary/30 transition-all duration-300 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        {/* Date */}
                        <div className="shrink-0 text-primary font-medium min-w-[100px]">
                          {formatDate(concert.date)}
                        </div>
                        
                        {/* Venue & City */}
                        <div className="flex-1">
                          <div className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                            {concert.venue}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {concert.city}, {concert.country}
                          </div>
                        </div>
                        
                        {/* Genre & Price */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="px-3 py-1 bg-primary/10 rounded-full text-primary text-xs">
                            {concert.genre}
                          </span>
                          <span>
                            {concert.price === "Free" ? "Free" : `€${concert.price}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Links Sidebar */}
            <div
              className={`transition-all duration-700 delay-300 ease-out ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-16"
              }`}
            >
              <div className="sticky top-32">
                <h3 className="font-serif text-2xl text-foreground mb-6">
                  Stream Our Music
                </h3>
                <div className="space-y-4">
                  {platforms.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-4 px-6 py-5 bg-secondary border border-border rounded-xl text-foreground transition-all duration-300 hover:border-transparent hover:text-white hover:scale-[1.02] ${platform.color}`}
                    >
                      <platform.icon />
                      <span className="font-medium text-lg">{platform.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SpotifyIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
