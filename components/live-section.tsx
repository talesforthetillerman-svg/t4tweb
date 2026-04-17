"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"
import { useVisualEditor } from "@/components/visual-editor"
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
import type { LiveConcert, LiveSectionData } from "@/lib/live-concerts-loader"

type Concert = LiveConcert

interface LiveSectionProps {
  data: LiveSectionData
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function LiveSection({ data }: LiveSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const concerts = data.concerts
  const { opacity, y } = useScrollAnimation(sectionRef)
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()

  useEffect(() => {
    if (!isEditing) return
    if (sectionRef.current) {
      registerEditable({
        id: 'live-section',
        type: 'section',
        label: 'Live Section',
        parentId: null,
        element: sectionRef.current,
        originalRect: sectionRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
      })
    }
    return () => {
      unregisterEditable('live-section')
    }
  }, [isEditing, registerEditable, unregisterEditable])

  const upcomingConcerts = concerts.filter(c => c.status === "Upcoming")
  const historyConcerts = concerts.filter(c => c.status === "Completed")

  const platforms = [
    { name: "Spotify", href: "https://open.spotify.com/artist/0FHjK3O0k8HQMrJsF7KQwF", icon: SpotifyIcon, color: "hover:bg-[#1DB954]", category: "streaming" },
    { name: "Apple Music", href: "https://music.apple.com/us/artist/tales-for-the-tillerman/1819840222", icon: AppleMusicIcon, color: "hover:bg-[#FA243C]", category: "streaming" },
    { name: "YouTube Music", href: "https://music.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ", icon: YouTubeIcon, color: "hover:bg-[#FF0000]", category: "streaming" },
    { name: "SoundCloud", href: "https://soundcloud.com/tales-for-the-tillerman", icon: SoundCloudIcon, color: "hover:bg-[#FF7700]", category: "streaming" },
    { name: "Bandcamp", href: "https://talesforthetillerman.bandcamp.com/", icon: BandcampIcon, color: "hover:bg-[#1DA0C3]", category: "streaming" },
    { name: "Amazon Music", href: "https://music.amazon.co.uk/artists/B0FCNWCSZC/tales-for-the-tillerman", icon: AmazonMusicIcon, color: "hover:bg-[#00A8E1]", category: "streaming" },
    { name: "Tidal", href: "https://tidal.com/artist/61948400", icon: TidalIcon, color: "hover:bg-[#00D7FF]", category: "streaming" },
    { name: "Deezer", href: "https://www.deezer.com/en/artist/330066641", icon: DeezerIcon, color: "hover:bg-[#FF0099]", category: "streaming" },
    { name: "YouTube", href: "https://www.youtube.com/@Tales4Tillerman", icon: YouTubeIcon, color: "hover:bg-[#FF0000]", category: "social" },
    { name: "Instagram", href: "https://www.instagram.com/tales4tillerman", icon: InstagramIcon, color: "hover:bg-[#E1306C]", category: "social" },
    { name: "TikTok", href: "https://www.tiktok.com/@tales.40.tilllerman", icon: TikTokIcon, color: "hover:bg-[#000000]", category: "social" },
    { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61575566232586", icon: FacebookIcon, color: "hover:bg-[#1877F2]", category: "social" },
  ]

  const resolveConcertDateText = (cardId: string, fallbackDate: string): string => {
    return formatDate(fallbackDate)
  }

  const resolveConcertVenueText = (cardId: string, fallback: string): string => {
    return fallback
  }

  const resolveConcertCityText = (cardId: string, fallbackCity: string): string => {
    return fallbackCity
  }

  const resolveConcertCountryText = (cardId: string, fallbackCountry: string): string => {
    return fallbackCountry
  }

  const resolveConcertSimpleField = (
    cardId: string,
    suffix: "genre" | "price" | "time",
    fallback: string
  ): string => {
    return fallback
  }

  return (
    <section
      ref={sectionRef}
      data-editor-node-id="live-section"
      data-editor-node-type="section"
      data-editor-node-label="Live Section"
      className="relative min-h-screen overflow-hidden"
      style={getElementLayoutStyle(data.elementStyles, "live-section")}
    >
<div
  className="absolute inset-0 -z-10"
  data-editor-node-id="live-section-bg-image"
  data-editor-node-type="background"
  data-editor-media-kind="image"
  data-editor-node-label="Live Section Background Image"
  style={getElementLayoutStyle(data.elementStyles, "live-section-bg-image")}
>
  <Image
    src={data.backgroundImageUrl}
    alt="Live section background"
    fill
    className="object-cover"
    sizes="100vw"
  />
</div>
      <div className="section-photo-scrim" />
      <div className="section-photo-fade-top" />

      <div className="relative z-10 w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* ── SEE ALL SHOWS ── */}
          <motion.div
            style={{ opacity, y }}
            className="mb-16 text-center"
          >
            <SectionHeader
              eyebrow="Live Performances"
              title="See All Shows"
              description="From intimate club shows to festival main stages, Tales for the Tillerman delivers an unforgettable live experience."
              dataEditId="live-see-shows-header"
              dataEditLabel="Live See Shows Header"
            />
<motion.a
  data-editor-node-id="live-section-see-shows-button"
  data-editor-node-type="button"
  data-editor-node-label="See All Shows Button"
  whileHover={isEditing ? undefined : { scale: 1.02, y: -2 }}
  transition={isEditing ? undefined : { type: "spring", stiffness: 320, damping: 22 }}
  href="https://www.bandsintown.com/e/108124718-tales-for-the-tillerman-at-mauerpark?came_from=250&utm_medium=web&utm_source=artist_page&utm_campaign=search_bar"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl min-h-[48px]"
  style={getElementLayoutStyle(data.elementStyles, "live-section-see-shows-button")}
>
  <BandsinTownIcon />
  {"Bandsintown"}
</motion.a>
          </motion.div>

          <div className="w-full">

            {/* ── STREAM OUR MUSIC ── */}
            <motion.div
              initial={isEditing ? false : { opacity: 0, y: 20 }}
              whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
              transition={isEditing ? undefined : { duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <SectionHeader
                eyebrow={"Listen"}
                title={"Stream Our Music"}
                className="mb-8"
                dataEditId="live-stream-header"
                dataEditLabel="Live Stream Header"
              />

              <div className="mb-10" data-editor-node-id="live-stream-platforms-group" data-editor-node-type="card" data-editor-node-label="Live Streaming Platforms Group" data-editor-grouped="true" style={getElementLayoutStyle(data.elementStyles, "live-stream-platforms-group")}>
                <h4 data-editor-node-id="live-stream-platforms-title" data-editor-node-type="text" data-editor-node-label="Spotify Apple Music and More" className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block" style={getElementLayoutStyle(data.elementStyles, "live-stream-platforms-title")}>
                  Spotify, Apple Music & More
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
{platforms.filter(p => p.category === "streaming").map((platform, index) => (
  <motion.a
    data-editor-node-id={`live-streaming-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
    data-editor-node-type="card"
    data-editor-node-label={`Streaming: ${platform.name}`}
    data-editor-grouped="true"
    key={platform.name}
    initial={isEditing ? false : { opacity: 0, y: 20 }}
    whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
    whileHover={isEditing ? undefined : { y: -2, scale: 1.02 }}
    transition={isEditing ? undefined : { duration: 0.35, delay: index * 0.04, type: "spring", stiffness: 320, damping: 22 }}
    href={platform.href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Listen on ${platform.name}`}
    title={platform.name}
    className={`flex flex-col items-center justify-center p-4 bg-secondary/50 border border-border rounded-xl text-foreground transition-all duration-300 hover:border-transparent hover:text-white shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${platform.color}`}
    style={getElementLayoutStyle(data.elementStyles, `live-streaming-${platform.name.toLowerCase().replace(/\s+/g, '-')}`)}
  >
    <platform.icon />
    <span className="text-xs font-medium text-center mt-2">{platform.name}</span>
  </motion.a>
))}
                </div>
              </div>

              <div data-editor-node-id="live-social-platforms-group" data-editor-node-type="card" data-editor-node-label="Live Social Platforms Group" data-editor-grouped="true" style={getElementLayoutStyle(data.elementStyles, "live-social-platforms-group")}>
                <h4 data-editor-node-id="live-social-platforms-title" data-editor-node-type="text" data-editor-node-label="Follow Us Title" className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block" style={getElementLayoutStyle(data.elementStyles, "live-social-platforms-title")}>
                  Follow Us
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
{platforms.filter(p => p.category === "social").map((platform, index) => (
  <motion.a
    data-editor-node-id={`live-social-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
    data-editor-node-type="card"
    data-editor-node-label={`Social: ${platform.name}`}
    data-editor-grouped="true"
    key={platform.name}
    initial={isEditing ? false : { opacity: 0, y: 20 }}
    whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
    whileHover={isEditing ? undefined : { y: -2, scale: 1.02 }}
    transition={isEditing ? undefined : { duration: 0.35, delay: index * 0.04, type: "spring", stiffness: 320, damping: 22 }}
    href={platform.href}
    target="_blank"
    rel="noopener noreferrer"
    title={platform.name}
    className={`flex flex-col items-center justify-center p-5 bg-secondary/50 border border-border rounded-xl text-foreground transition-all duration-300 hover:border-transparent hover:text-white shadow-lg hover:shadow-xl ${platform.color}`}
    style={getElementLayoutStyle(data.elementStyles, `live-social-${platform.name.toLowerCase().replace(/\s+/g, '-')}`)}
  >
    <platform.icon />
    <span className="text-xs font-medium text-center mt-2">{platform.name}</span>
  </motion.a>
))}
                </div>
              </div>
            </motion.div>

            {/* ── UPCOMING SHOWS ── */}
            <motion.div
              initial={isEditing ? false : { opacity: 0, y: 20 }}
              whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
              transition={isEditing ? undefined : { duration: 0.6, delay: 0.3 }}
              className="mb-12 min-h-[440px]"
            >
              <h3
                data-editor-node-id="live-upcoming-title"
                data-editor-node-type="text"
                data-editor-node-label="Live Upcoming Title"
                className="font-serif text-2xl md:text-3xl text-foreground mb-6 text-center"
                style={getElementLayoutStyle(data.elementStyles, "live-upcoming-title")}
              >
                Upcoming
              </h3>

              {upcomingConcerts.length > 0 && (
                <div
                  data-editor-node-id="live-upcoming-list"
                  data-editor-node-type="card"
                  data-editor-node-label="Live Upcoming List"
                  data-editor-grouped="true"
                  className="space-y-3"
                  style={getElementLayoutStyle(data.elementStyles, "live-upcoming-list")}
                  
                >
                  {upcomingConcerts.map((concert, index) => (
                    (() => {
                      const cardId = `live-upcoming-event-${concert._editorId}`
                      const rawPrice = resolveConcertSimpleField(cardId, "price", concert.price)
                      const priceLabel = rawPrice === "Free" ? "Free" : rawPrice.startsWith("€") ? rawPrice : `€${rawPrice}`
                      return (
                    <motion.div
                      key={`upcoming-${concert._editorId}`}
                      initial={isEditing ? false : { opacity: 0, y: 20 }}
                      whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
                      whileHover={isEditing ? undefined : { y: -2, scale: 1.01 }}
                      transition={isEditing ? undefined : { duration: 0.4, delay: index * 0.03, type: "spring", stiffness: 300, damping: 20 }}
                      data-editor-node-id={cardId}
                      data-editor-node-type="card"
                      data-editor-node-label={`Upcoming Event ${index + 1}`}
                      data-editor-grouped="true"
                      data-concert-card="true"
                      className="min-h-[80px] p-5 bg-secondary/50 rounded-xl border border-border hover:border-primary/30 transition-all duration-300 group shadow-lg hover:shadow-xl flex items-center"
                      style={getElementLayoutStyle(data.elementStyles, cardId)}
                      
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
                        <div
                          data-editor-node-id={`${cardId}-date`}
                          data-editor-node-type="text"
                          data-editor-node-label={`Upcoming Event ${index + 1} Date`}
                          data-concert-field="date"
                          style={getElementLayoutStyle(data.elementStyles, `${cardId}-date`)}
                          className="shrink-0 text-primary font-medium min-w-[100px]">
                          {resolveConcertDateText(cardId, concert.date)}
                        </div>
                        <div className="flex-1">
                          <div
                            data-editor-node-id={`${cardId}-venue`}
                            data-editor-node-type="text"
                            data-editor-node-label={`Upcoming Event ${index + 1} Venue`}
                            data-concert-field="venue"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-venue`)}
                            className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                            {resolveConcertVenueText(cardId, concert.venue)}
                          </div>
                          <div
                            data-editor-node-id={`${cardId}-city`}
                            data-editor-node-type="text"
                            data-editor-node-label={`Upcoming Event ${index + 1} Location`}
                            data-concert-field="city"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-city`)}
                            className="text-muted-foreground text-sm">
                            {resolveConcertCityText(cardId, concert.city)}
                            {resolveConcertCityText(cardId, concert.city) && resolveConcertCountryText(cardId, concert.country) ? " · " : ""}
                            <span
                              data-editor-node-id={`${cardId}-country`}
                              data-editor-node-type="text"
                              data-editor-node-label={`Upcoming Event ${index + 1} Country`}
                              data-concert-field="country"
                              style={getElementLayoutStyle(data.elementStyles, `${cardId}-country`)}>
                              {resolveConcertCountryText(cardId, concert.country)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground sm:ml-auto">
                          <span
                            data-editor-node-id={`${cardId}-genre`}
                            data-editor-node-type="text"
                            data-editor-node-label={`Upcoming Event ${index + 1} Genre`}
                            data-concert-field="genre"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-genre`)}
                            className="px-3 py-1 bg-primary/10 rounded-full text-primary text-xs">
                            {resolveConcertSimpleField(cardId, "genre", concert.genre)}
                          </span>
                          <span
                            data-editor-node-id={`${cardId}-price`}
                            data-editor-node-type="text"
                            data-editor-node-label={`Upcoming Event ${index + 1} Price`}
                            data-concert-field="price"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-price`)}>
                            {priceLabel}
                          </span>
                          <span
                            data-editor-node-id={`${cardId}-time`}
                            data-editor-node-type="text"
                            data-editor-node-label={`Upcoming Event ${index + 1} Time`}
                            data-concert-field="time"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-time`)}
                            className="text-xs">
                            {resolveConcertSimpleField(cardId, "time", concert.time)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                      )
                    })()
                  ))}
                </div>
              )}

              {upcomingConcerts.length === 0 && (
                <div
                  data-editor-node-id="live-upcoming-empty"
                  data-editor-node-type="card"
                  data-editor-node-label="Live Upcoming Empty State"
                  className="text-center py-8 px-6 bg-secondary/20 border border-border rounded-xl"
                  style={getElementLayoutStyle(data.elementStyles, "live-upcoming-empty")}
                  
                >
                  <p
                    data-editor-node-id="live-upcoming-empty-text"
                    data-editor-node-type="text"
                    data-editor-node-label="Live Upcoming Empty Text"
                    className="text-muted-foreground"
                    style={getElementLayoutStyle(data.elementStyles, "live-upcoming-empty-text")}
                    
                  >
                    {"No upcoming shows scheduled."}
                  </p>
                </div>
              )}
            </motion.div>

            {/* ── HISTORY ── */}
            <motion.div
              initial={isEditing ? false : { opacity: 0, y: 20 }}
              whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
              transition={isEditing ? undefined : { duration: 0.6, delay: 0.35 }}
              className="mb-12"
            >
              <h3
                data-editor-node-id="live-history-title"
                data-editor-node-type="text"
                data-editor-node-label="Live History Title"
                className="font-serif text-2xl md:text-3xl text-foreground mb-6 text-center"
                style={getElementLayoutStyle(data.elementStyles, "live-history-title")}
              >
                History
              </h3>

              {historyConcerts.length > 0 && (
                <div
                  data-editor-node-id="live-history-list"
                  data-editor-node-type="card"
                  data-editor-node-label="Live History List"
                  data-editor-grouped="true"
                  className="space-y-3"
                  style={getElementLayoutStyle(data.elementStyles, "live-history-list")}
                  
                >
                  {historyConcerts.map((concert, index) => (
                    (() => {
                      const cardId = `live-history-event-${concert._editorId}`
                      const rawPrice = resolveConcertSimpleField(cardId, "price", concert.price)
                      const priceLabel = rawPrice === "Free" ? "Free" : rawPrice.startsWith("€") ? rawPrice : `€${rawPrice}`
                      return (
                    <motion.div
                      key={`history-${concert._editorId}`}
                      initial={isEditing ? false : { opacity: 0, y: 20 }}
                      whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
                      whileHover={isEditing ? undefined : { y: -2, scale: 1.01 }}
                      transition={isEditing ? undefined : { duration: 0.4, delay: index * 0.03, type: "spring", stiffness: 300, damping: 20 }}
                      data-editor-node-id={cardId}
                      data-editor-node-type="card"
                      data-editor-node-label={`History Event ${index + 1}`}
                      data-editor-grouped="true"
                      data-concert-card="true"
                      className="min-h-[80px] p-5 bg-secondary/30 rounded-xl border border-border/50 hover:border-primary/20 transition-all duration-300 group shadow-lg hover:shadow-xl flex items-center"
                      style={getElementLayoutStyle(data.elementStyles, cardId)}
                      
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
                        <div
                          data-editor-node-id={`${cardId}-date`}
                          data-editor-node-type="text"
                          data-editor-node-label={`History Event ${index + 1} Date`}
                          data-concert-field="date"
                          style={getElementLayoutStyle(data.elementStyles, `${cardId}-date`)}
                          className="shrink-0 text-muted-foreground font-medium min-w-[100px]">
                          {resolveConcertDateText(cardId, concert.date)}
                        </div>
                        <div className="flex-1">
                          <div
                            data-editor-node-id={`${cardId}-venue`}
                            data-editor-node-type="text"
                            data-editor-node-label={`History Event ${index + 1} Venue`}
                            data-concert-field="venue"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-venue`)}
                            className="font-serif text-lg text-muted-foreground group-hover:text-foreground transition-colors">
                            {resolveConcertVenueText(cardId, concert.venue)}
                          </div>
                          <div
                            data-editor-node-id={`${cardId}-city`}
                            data-editor-node-type="text"
                            data-editor-node-label={`History Event ${index + 1} Location`}
                            data-concert-field="city"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-city`)}
                            className="text-muted-foreground/70 text-sm">
                            {resolveConcertCityText(cardId, concert.city)}
                            {resolveConcertCityText(cardId, concert.city) && resolveConcertCountryText(cardId, concert.country) ? " · " : ""}
                            <span
                              data-editor-node-id={`${cardId}-country`}
                              data-editor-node-type="text"
                              data-editor-node-label={`History Event ${index + 1} Country`}
                              data-concert-field="country"
                              style={getElementLayoutStyle(data.elementStyles, `${cardId}-country`)}>
                              {resolveConcertCountryText(cardId, concert.country)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-0 flex shrink-0 flex-wrap items-center gap-2 text-sm text-muted-foreground/70 sm:ml-auto sm:justify-end sm:gap-4">
                          <span
                            data-editor-node-id={`${cardId}-genre`}
                            data-editor-node-type="text"
                            data-editor-node-label={`History Event ${index + 1} Genre`}
                            data-concert-field="genre"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-genre`)}
                            className="px-3 py-1 bg-secondary/50 rounded-full text-xs">
                            {resolveConcertSimpleField(cardId, "genre", concert.genre)}
                          </span>
                          <span
                            data-editor-node-id={`${cardId}-price`}
                            data-editor-node-type="text"
                            data-editor-node-label={`History Event ${index + 1} Price`}
                            data-concert-field="price"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-price`)}>
                            {priceLabel}
                          </span>
                          <span
                            data-editor-node-id={`${cardId}-time`}
                            data-editor-node-type="text"
                            data-editor-node-label={`History Event ${index + 1} Time`}
                            data-concert-field="time"
                            style={getElementLayoutStyle(data.elementStyles, `${cardId}-time`)}
                            className="text-xs">
                            {resolveConcertSimpleField(cardId, "time", concert.time)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                      )
                    })()
                  ))}
                </div>
              )}
              {historyConcerts.length === 0 && (
                <div
                  data-editor-node-id="live-history-empty"
                  data-editor-node-type="card"
                  data-editor-node-label="Live History Empty State"
                  className="text-center py-8 px-6 bg-secondary/20 border border-border rounded-xl"
                  style={getElementLayoutStyle(data.elementStyles, "live-history-empty")}
                  
                >
                  <p
                    data-editor-node-id="live-history-empty-text"
                    data-editor-node-type="text"
                    data-editor-node-label="Live History Empty Text"
                    className="text-muted-foreground"
                    style={getElementLayoutStyle(data.elementStyles, "live-history-empty-text")}
                    
                  >
                    {"No past shows available."}
                  </p>
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </div>

      <div className="section-photo-fade-bottom" />
    </section>
  )
}

function SpotifyIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
}

function YouTubeIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
}

function InstagramIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
}

function AppleMusicIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.098 10.638c0-1.1.08-2.267.244-3.57 0-.603.528-1.1 1.117-1.1.59 0 1.12.497 1.12 1.1-.206 1.303-.326 2.47-.326 3.57 0 8.998 5.291 16.594 12.061 20.15h-.003c.4.23.654.668.654 1.15 0 .744-.603 1.346-1.345 1.346-.527 0-.996-.31-1.212-.744-.259-.528-.528-1.057-.806-1.646h-1.923c-.28.59-.548 1.12-.806 1.646-.216.435-.685.744-1.212.744-.742 0-1.345-.603-1.345-1.346 0-.482.254-.92.654-1.15 6.77-3.556 12.061-11.152 12.061-20.15zm-6.055 1.104c0 .836.68 1.516 1.516 1.516.835 0 1.515-.68 1.515-1.516 0-.835-.68-1.515-1.515-1.515-.836 0-1.516.68-1.516 1.515zm8.993 6.057c-.683 0-1.237.554-1.237 1.237 0 .683.554 1.238 1.237 1.238.684 0 1.238-.555 1.238-1.238 0-.683-.554-1.237-1.238-1.237zm-14.22-8.76c1.1 1.1 1.897 2.678 1.897 4.45 0 3.553-2.898 6.451-6.452 6.451-3.553 0-6.451-2.898-6.451-6.451 0-1.772.797-3.35 1.897-4.45C-2.09 8.537-2.696 6.264-2.696 3.76c0-5.516 4.48-9.996 9.996-9.996 5.516 0 9.996 4.48 9.996 9.996 0 2.504-.607 4.777-1.59 6.825z"/></svg>
}

function AmazonMusicIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6.5 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3m3.5-9h2.15v12.87h-2.15zm5 0h2.15v12.87h-2.15zM.5 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
}

function SoundCloudIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M1.175 12.225c-.051 0-.175.016-.175.175v1.2c0 .158.124.175.175.175.051 0 .175-.017.175-.175v-1.2c0-.159-.124-.175-.175-.175zm1.633 1.957c-.089 0-.109.124-.109.175v.65c0 .051.02.175.109.175.088 0 .108-.124.108-.175v-.65c0-.051-.02-.175-.108-.175zm1.308-1.957c-.052 0-.175.016-.175.175v1.2c0 .158.123.175.175.175.051 0 .175-.017.175-.175v-1.2c0-.159-.124-.175-.175-.175zm1.337 1.296c-.051 0-.175.017-.175.175v.725c0 .158.124.175.175.175.051 0 .175-.017.175-.175v-.725c0-.158-.124-.175-.175-.175zm7.326-5.553c-.759 0-1.451.205-2.057.561-.184-3.214-2.969-5.745-6.326-5.745-3.595 0-6.513 2.849-6.513 6.359 0 .339.029.671.087.998-.57.583-.925 1.391-.925 2.285 0 1.873 1.505 3.39 3.371 3.39h12.443c2.208 0 4-1.79 4-4s-1.792-4-4-4z"/></svg>
}

function BandcampIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M5.51 2H2.72A1.97 1.97 0 0 0 .75 3.97v16.06A1.97 1.97 0 0 0 2.72 22h16.06a1.97 1.97 0 0 0 1.97-1.97V3.97A1.97 1.97 0 0 0 18.78 2H5.51zm5.96 11.37l-4.15 5.54h4.15V13.37z"/></svg>
}

function TidalIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 2L0 8v8l8 6 8-6V8L8 2zm4 10l-4 3-4-3V6l4-3 4 3v6z"/></svg>
}

function DeezerIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h4v2H2V4zm6 0h4v2H8V4zm6 0h4v2h-4V4zm-12 4h4v2H2V8zm6 0h4v2H8V8zm6 0h4v2h-4V8zm-12 4h4v2H2v-2zm6 0h4v2H8v-2zm6 0h4v2h-4v-2zm-12 4h4v2H2v-2zm6 0h4v2H8v-2zm6 0h4v2h-4v-2z"/></svg>
}

function TikTokIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.51v13.69a2.82 2.82 0 0 1-2.94 2.85 2.88 2.88 0 0 1-2.94-2.85c0-1.56 1.3-2.91 2.94-2.91.37 0 .74.08 1.1.24V9.4a5.9 5.9 0 0 0-1.1-.1C5.5 9.3 2 12.78 2 17.01c0 4.2 3.5 7.69 7.79 7.69 4.29 0 7.79-3.49 7.79-7.69 0-.29 0-.58-.03-.87.16.03.3.07.47.09v-3.1a5.1 5.1 0 0 1-.94-.09"/></svg>
}

function FacebookIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
}

function BandsinTownIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm3-10c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm-2 0c0-1.105-.895-2-2-2s-2 .895-2 2 .895 2 2 2 2-.895 2-2z"/></svg>
}
