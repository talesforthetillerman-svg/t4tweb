"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"

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
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { opacity, y } = useScrollAnimation(sectionRef)

  // Fetch and parse CSV data with error handling
  useEffect(() => {
    async function fetchConcerts() {
      try {
        const response = await fetch("/data/concerts.csv")
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const csv = await response.text()
        const parsed = parseCSV(csv)
        // Sort by date, most recent first
        const sorted = parsed.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setConcerts(sorted)
        setError(false)
      } catch (error) {
        console.error("Error loading concert data:", error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchConcerts()
  }, [])

  const platforms = [
    {
      name: "Spotify",
      href: "https://open.spotify.com/artist/0FHjK3O0k8HQMrJsF7KQwF",
      icon: SpotifyIcon,
      color: "hover:bg-[#1DB954]",
      category: "streaming",
    },
    {
      name: "Apple Music",
      href: "https://music.apple.com/us/artist/tales-for-the-tillerman/1819840222",
      icon: AppleMusicIcon,
      color: "hover:bg-[#FA243C]",
      category: "streaming",
    },
    {
      name: "YouTube Music",
      href: "https://music.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ",
      icon: YouTubeIcon,
      color: "hover:bg-[#FF0000]",
      category: "streaming",
    },
    {
      name: "SoundCloud",
      href: "https://soundcloud.com/tales-for-the-tillerman",
      icon: SoundCloudIcon,
      color: "hover:bg-[#FF7700]",
      category: "streaming",
    },
    {
      name: "Bandcamp",
      href: "https://talesforthetillerman.bandcamp.com/",
      icon: BandcampIcon,
      color: "hover:bg-[#1DA0C3]",
      category: "streaming",
    },
    {
      name: "Amazon Music",
      href: "https://music.amazon.co.uk/artists/B0FCNWCSZC/tales-for-the-tillerman",
      icon: AmazonMusicIcon,
      color: "hover:bg-[#00A8E1]",
      category: "streaming",
    },
    {
      name: "Tidal",
      href: "https://tidal.com/artist/61948400",
      icon: TidalIcon,
      color: "hover:bg-[#00D7FF]",
      category: "streaming",
    },
    {
      name: "Deezer",
      href: "https://www.deezer.com/en/artist/330066641",
      icon: DeezerIcon,
      color: "hover:bg-[#FF0099]",
      category: "streaming",
    },
    {
      name: "Bandsintown",
      href: "https://www.bandsintown.com/a/15468933-tales-for-the-tillerman",
      icon: BandsinTownIcon,
      color: "hover:bg-[#3B5998]",
      category: "streaming",
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/@Tales4Tillerman",
      icon: YouTubeIcon,
      color: "hover:bg-[#FF0000]",
      category: "social",
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/tales4tillerman",
      icon: InstagramIcon,
      color: "hover:bg-[#E1306C]",
      category: "social",
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@tales.40.tilllerman",
      icon: TikTokIcon,
      color: "hover:bg-[#000000]",
      category: "social",
    },
    {
      name: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61575566232586",
      icon: FacebookIcon,
      color: "hover:bg-[#1877F2]",
      category: "social",
    },
  ]

  return (
    <section id="live" ref={sectionRef} className="relative py-16 md:py-20 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/sections/live-bg.jpg"
          alt="Live section background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            style={{ opacity, y }}
            className="text-center mb-12"
          >
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block"
            >
              Experience
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance"
            >
              Our Show History
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted-foreground max-w-2xl mx-auto text-lg"
            >
              From intimate club shows to festival main stages, Tales for the Tillerman 
              delivers an unforgettable live experience.
            </motion.p>
          </motion.div>

          <div className="w-full">
            {/* Platform Links Sidebar - NOW FIRST */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-3 mb-12"
            >
              <div className="mt-0">
                <h3 className="font-serif text-3xl text-foreground mb-8 text-center">
                  Stream Our Music
                </h3>

                {/* Featured: Bandsintown Button */}
                <div className="mb-10 flex justify-center">
                  <motion.a
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    href="https://www.bandsintown.com/a/15468933-tales-for-the-tillerman"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
                  >
                    <BandsinTownIcon />
                    See All Shows on Bandsintown
                  </motion.a>
                </div>
                
                {/* Streaming Platforms */}
                <div className="mb-10">
                  <h4 className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
                    Spotify, Apple Music & More
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {platforms.filter(p => p.category === "streaming" && p.name !== "Bandsintown").map((platform, index) => (
                      <motion.a
                        key={platform.name}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -4, scale: 1.05 }}
                        transition={{ duration: 0.4, delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                        href={platform.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Listen on ${platform.name}`}
                        title={platform.name}
                        className={`flex flex-col items-center justify-center p-4 bg-secondary/50 border border-border rounded-xl text-foreground transition-all duration-300 hover:border-transparent hover:text-white shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${platform.color}`}
                      >
                        <platform.icon />
                        <span className="text-xs font-medium text-center mt-2">{platform.name}</span>
                      </motion.a>
                    ))}
                  </div>
                </div>

                {/* Social Networks */}
                <div>
                  <h4 className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
                    Follow Us
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {platforms.filter(p => p.category === "social").map((platform, index) => (
                      <motion.a
                        key={platform.name}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -4, scale: 1.05 }}
                        transition={{ duration: 0.4, delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                        href={platform.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={platform.name}
                        className={`flex flex-col items-center justify-center p-5 bg-secondary/50 border border-border rounded-xl text-foreground transition-all duration-300 hover:border-transparent hover:text-white shadow-lg hover:shadow-xl ${platform.color}`}
                      >
                        <platform.icon />
                        <span className="text-xs font-medium text-center mt-2">{platform.name}</span>
                      </motion.a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Upcoming Shows Block - CLS Prevention */}
            {/* 
              CLS Prevention Strategy:
              1. Container has min-height to reserve space during loading
              2. Skeleton placeholders match final content height (80px each)
              3. All states (loading/error/empty/success) use consistent spacing
              4. No layout shift when transitioning between states
            */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-12 min-h-[440px]"
            >
              <h3 className="font-serif text-2xl text-foreground mb-6 text-center">
                Upcoming Shows
              </h3>
              
              {/* LOADING STATE - Elegant skeleton loader */}
              {loading && (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="min-h-[80px] bg-gradient-to-r from-secondary/30 via-secondary/50 to-secondary/30 rounded-xl overflow-hidden"
                    >
                      {/* Shimmer animation */}
                      <div className="h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    </div>
                  ))}
                </div>
              )}
              
              {/* ERROR STATE - Fallback when CSV fails */}
              {!loading && error && (
                <div className="text-center py-12 px-6 bg-red-950/20 border border-red-900/30 rounded-xl">
                  <div className="text-red-400 mb-4">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 opacity-70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Unable to load shows at the moment.
                  </p>
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    href="https://www.bandsintown.com/a/15468933-tales-for-the-tillerman"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all"
                  >
                    Check Shows on Bandsintown
                  </motion.a>
                </div>
              )}
              
              {/* EMPTY STATE - No concerts */}
              {!loading && !error && concerts.length === 0 && (
                <div className="text-center py-12 px-6 bg-secondary/20 border border-border rounded-xl">
                  <div className="text-muted-foreground mb-4">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground mb-2">No shows scheduled at the moment.</p>
                  <p className="text-muted-foreground text-sm mb-6">
                    Follow us for exciting tour announcements coming soon!
                  </p>
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    href="https://www.bandsintown.com/a/15468933-tales-for-the-tillerman"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all"
                  >
                    <BandsinTownIcon />
                    See All Shows on Bandsintown
                  </motion.a>
                </div>
              )}
              
              {/* SUCCESS STATE - Show concerts */}
              {!loading && !error && concerts.length > 0 && (
                <div className="space-y-3">
                  {concerts.map((concert, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.03,
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="min-h-[80px] p-5 bg-secondary/50 rounded-xl border border-border hover:border-primary/30 transition-all duration-300 group shadow-lg hover:shadow-xl flex items-center"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
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
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
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

function AppleMusicIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.098 10.638c0-1.1.08-2.267.244-3.57 0-.603.528-1.1 1.117-1.1.59 0 1.12.497 1.12 1.1-.206 1.303-.326 2.47-.326 3.57 0 8.998 5.291 16.594 12.061 20.15h-.003c.4.23.654.668.654 1.15 0 .744-.603 1.346-1.345 1.346-.527 0-.996-.31-1.212-.744-.259-.528-.528-1.057-.806-1.646h-1.923c-.28.59-.548 1.12-.806 1.646-.216.435-.685.744-1.212.744-.742 0-1.345-.603-1.345-1.346 0-.482.254-.92.654-1.15 6.77-3.556 12.061-11.152 12.061-20.15zm-6.055 1.104c0 .836.68 1.516 1.516 1.516.835 0 1.515-.68 1.515-1.516 0-.835-.68-1.515-1.515-1.515-.836 0-1.516.68-1.516 1.515zm8.993 6.057c-.683 0-1.237.554-1.237 1.237 0 .683.554 1.238 1.237 1.238.684 0 1.238-.555 1.238-1.238 0-.683-.554-1.237-1.238-1.237zm-14.22-8.76c1.1 1.1 1.897 2.678 1.897 4.45 0 3.553-2.898 6.451-6.452 6.451-3.553 0-6.451-2.898-6.451-6.451 0-1.772.797-3.35 1.897-4.45C-2.09 8.537-2.696 6.264-2.696 3.76c0-5.516 4.48-9.996 9.996-9.996 5.516 0 9.996 4.48 9.996 9.996 0 2.504-.607 4.777-1.59 6.825z" />
    </svg>
  )
}

function AmazonMusicIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6.5 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3m3.5-9h2.15v12.87h-2.15zm5 0h2.15v12.87h-2.15zM.5 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  )
}

function SoundCloudIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.175 12.225c-.051 0-.175.016-.175.175v1.2c0 .158.124.175.175.175.051 0 .175-.017.175-.175v-1.2c0-.159-.124-.175-.175-.175zm1.633 1.957c-.089 0-.109.124-.109.175v.65c0 .051.02.175.109.175.088 0 .108-.124.108-.175v-.65c0-.051-.02-.175-.108-.175zm1.308-1.957c-.052 0-.175.016-.175.175v1.2c0 .158.123.175.175.175.051 0 .175-.017.175-.175v-1.2c0-.159-.124-.175-.175-.175zm1.337 1.296c-.051 0-.175.017-.175.175v.725c0 .158.124.175.175.175.051 0 .175-.017.175-.175v-.725c0-.158-.124-.175-.175-.175zm7.326-5.553c-.759 0-1.451.205-2.057.561-.184-3.214-2.969-5.745-6.326-5.745-3.595 0-6.513 2.849-6.513 6.359 0 .339.029.671.087.998-.57.583-.925 1.391-.925 2.285 0 1.873 1.505 3.39 3.371 3.39h12.443c2.208 0 4-1.79 4-4s-1.792-4-4-4z" />
    </svg>
  )
}

function BandcampIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5.51 2H2.72A1.97 1.97 0 0 0 .75 3.97v16.06A1.97 1.97 0 0 0 2.72 22h16.06a1.97 1.97 0 0 0 1.97-1.97V3.97A1.97 1.97 0 0 0 18.78 2H5.51zm5.96 11.37l-4.15 5.54h4.15V13.37z" />
    </svg>
  )
}

function TidalIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 2L0 8v8l8 6 8-6V8L8 2zm4 10l-4 3-4-3V6l4-3 4 3v6z" />
    </svg>
  )
}

function DeezerIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M2 4h4v2H2V4zm6 0h4v2H8V4zm6 0h4v2h-4V4zm-12 4h4v2H2V8zm6 0h4v2H8V8zm6 0h4v2h-4V8zm-12 4h4v2H2v-2zm6 0h4v2H8v-2zm6 0h4v2h-4v-2zm-12 4h4v2H2v-2zm6 0h4v2H8v-2zm6 0h4v2h-4v-2z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.51v13.69a2.82 2.82 0 0 1-2.94 2.85 2.88 2.88 0 0 1-2.94-2.85c0-1.56 1.3-2.91 2.94-2.91.37 0 .74.08 1.1.24V9.4a5.9 5.9 0 0 0-1.1-.1C5.5 9.3 2 12.78 2 17.01c0 4.2 3.5 7.69 7.79 7.69 4.29 0 7.79-3.49 7.79-7.69 0-.29 0-.58-.03-.87.16.03.3.07.47.09v-3.1a5.1 5.1 0 0 1-.94-.09" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function BandsinTownIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm3-10c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm-2 0c0-1.105-.895-2-2-2s-2 .895-2 2 .895 2 2 2 2-.895 2-2z" />
    </svg>
  )
}
