"use client"

import { useRef, useEffect, useMemo, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import { useVisualEditor } from "@/components/visual-editor"
import type { HeroData } from "@/lib/sanity/hero-loader"


/**
 * Maps CMS / deploy elementStyles to inline CSS.
 * Must match visual-editor `applyNodeToDom`: position uses `transform: translate()` with
 * `transformOrigin: top left` — not `left`/`top`, or the public page shifts by a different
 * amount than in the editor (especially vs default transform-origin center).
 */
function getElementStyle(elementStyles: Record<string, unknown> | undefined, targetId: string): React.CSSProperties {
  if (!elementStyles || !elementStyles[targetId]) return {}

  const styles = elementStyles[targetId] as Record<string, unknown>
  const result: React.CSSProperties = {}

  const hasX = typeof styles.x === "number"
  const hasY = typeof styles.y === "number"
  const tx = hasX ? (styles.x as number) : 0
  const ty = hasY ? (styles.y as number) : 0
  const scaleVal = typeof styles.scale === "number" ? styles.scale : 1
  const needTranslate = hasX || hasY
  const needScale = typeof styles.scale === "number" && scaleVal !== 1

  if (needTranslate || needScale) {
    const parts: string[] = []
    parts.push(`translate(${tx}px, ${ty}px)`)
    if (needScale) parts.push(`scale(${scaleVal})`)
    result.transform = parts.join(" ")
    result.transformOrigin = "top left"
  }

  if (typeof styles.width === "number") result.width = `${styles.width}px`
  if (typeof styles.height === "number") result.height = `${styles.height}px`
  if (typeof styles.fontSize === "number") result.fontSize = `${styles.fontSize}px`
  if (typeof styles.fontWeight === "number") result.fontWeight = styles.fontWeight
  if (typeof styles.letterSpacing === "number") result.letterSpacing = `${styles.letterSpacing}px`
  if (typeof styles.lineHeight === "number") result.lineHeight = styles.lineHeight
  if (typeof styles.color === "string") result.color = styles.color
  if (typeof styles.maxWidth === "number") result.maxWidth = `${styles.maxWidth}px`

  return result
}

interface HeroDebug {
  sourceUsed: "server"
  hasTitleSegments: boolean
  titleSegmentsCount: number
  titleValue: string
  titleHighlightValue: string
  segmentTexts: string[]
  hasGradientFields: boolean
}

interface HeroTitleSegment {
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  opacity?: number
  fontSize?: string
  fontFamily?: string
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
}

export function HeroSection({ data }: { data: HeroData }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isDebugMode, setIsDebugMode] = useState(false)

  // Build debug info from server-passed data
  const debug = useMemo<HeroDebug>(() => ({
    sourceUsed: "server",
    hasTitleSegments: Array.isArray(data.titleSegments) && data.titleSegments.length > 0,
    titleSegmentsCount: Array.isArray(data.titleSegments) ? data.titleSegments.length : 0,
    titleValue: data.title || "",
    titleHighlightValue: data.titleHighlight || "",
    segmentTexts: Array.isArray(data.titleSegments) ? data.titleSegments.map((s) => s.text || "") : [],
    hasGradientFields: Array.isArray(data.titleSegments) && data.titleSegments.some((s) => s.gradientEnabled === true),
  }), [data])

  // Editable refs
  const heroSectionRef = useRef<HTMLElement>(null)
  const heroBgRef = useRef<HTMLDivElement>(null)
  const heroLogoRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroSubtitleRef = useRef<HTMLParagraphElement>(null)
  const heroButtonsRef = useRef<HTMLDivElement>(null)
  const heroScrollRef = useRef<HTMLDivElement>(null)

  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()

  // Sync debug mode from query param (client-side only after hydration)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setIsDebugMode(isEditing || params.get("heroDebug") === "1")
  }, [isEditing])

  // Register editable elements - only on isEditing change
  useEffect(() => {
    if (!isEditing) return

    const registerAll = () => {
      if (heroSectionRef.current) {
        const existing = getElementById('hero-section')
        registerEditable({
          id: 'hero-section',
          type: 'section',
          label: 'Hero Section',
          parentId: null,
          element: heroSectionRef.current,
          originalRect: heroSectionRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroSectionRef.current.offsetWidth, height: heroSectionRef.current.offsetHeight },
        })
      }

      if (heroBgRef.current) {
        const existing = getElementById('hero-bg-image')
        registerEditable({
          id: 'hero-bg-image',
          type: 'image',
          label: 'Hero Background',
          parentId: null,
          element: heroBgRef.current,
          originalRect: heroBgRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroBgRef.current.offsetWidth, height: heroBgRef.current.offsetHeight },
        })
      }

      if (heroLogoRef.current) {
        const existing = getElementById('hero-logo')
        registerEditable({
          id: 'hero-logo',
          type: 'image',
          label: 'Hero Logo',
          parentId: null,
          element: heroLogoRef.current,
          originalRect: heroLogoRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroLogoRef.current.offsetWidth, height: heroLogoRef.current.offsetHeight },
        })
      }

      if (heroTitleRef.current) {
        const existing = getElementById('hero-title')
        registerEditable({
          id: 'hero-title',
          type: 'text',
          label: 'Hero Title',
          parentId: null,
          element: heroTitleRef.current,
          originalRect: heroTitleRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroTitleRef.current.offsetWidth, height: heroTitleRef.current.offsetHeight },
        })
      }

      if (heroSubtitleRef.current) {
        const existing = getElementById('hero-subtitle')
        registerEditable({
          id: 'hero-subtitle',
          type: 'text',
          label: 'Hero Subtitle',
          parentId: null,
          element: heroSubtitleRef.current,
          originalRect: heroSubtitleRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroSubtitleRef.current.offsetWidth, height: heroSubtitleRef.current.offsetHeight },
        })
      }

      if (heroButtonsRef.current) {
        const existing = getElementById('hero-buttons')
        registerEditable({
          id: 'hero-buttons',
          type: 'box',
          label: 'Hero Buttons',
          parentId: null,
          element: heroButtonsRef.current,
          originalRect: heroButtonsRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroButtonsRef.current.offsetWidth, height: heroButtonsRef.current.offsetHeight },
        })
      }

      if (heroScrollRef.current) {
        const existing = getElementById('hero-scroll-indicator')
        registerEditable({
          id: 'hero-scroll-indicator',
          type: 'box',
          label: 'Scroll Indicator',
          parentId: null,
          element: heroScrollRef.current,
          originalRect: heroScrollRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroScrollRef.current.offsetWidth, height: heroScrollRef.current.offsetHeight },
        })
      }
    }

    registerAll()

    return () => {
      unregisterEditable('hero-section')
      unregisterEditable('hero-bg-image')
      unregisterEditable('hero-logo')
      unregisterEditable('hero-title')
      unregisterEditable('hero-subtitle')
      unregisterEditable('hero-buttons')
      unregisterEditable('hero-scroll-indicator')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.06])
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 35])

  const content = data
  const heroTitleMode: "legacy" | "segmented" = Array.isArray(content.titleSegments) && content.titleSegments.length > 0 ? "segmented" : "legacy"
  const normalizedTitleSegments = useMemo(() => {
    if (heroTitleMode !== "segmented") return []
    const source = (content.titleSegments || []).map((segment) => ({ ...segment, text: (segment.text || "").trim() })).filter((segment) => segment.text.length > 0)
    if (source.length === 0) return []

    const deduped: HeroTitleSegment[] = []
    source.forEach((segment) => {
      const previous = deduped[deduped.length - 1]
      if (previous && previous.text.toLowerCase() === segment.text.toLowerCase()) return
      deduped.push(segment)
    })

    if (deduped.length >= 2) {
      const first = deduped[0]
      const second = deduped[1]
      const firstLower = first.text.toLowerCase()
      const secondLower = second.text.toLowerCase()
      if (firstLower.endsWith(secondLower) && first.text.length > second.text.length) {
        const trimmedFirst = first.text.slice(0, first.text.length - second.text.length).trim()
        if (trimmedFirst.length > 0) {
          deduped[0] = { ...first, text: trimmedFirst }
        }
      }
    }

    return deduped
  }, [content.titleSegments, heroTitleMode])

  return (
    <section
      ref={(el) => {
        sectionRef.current = el
        heroSectionRef.current = el
      }}
      id="top"
      data-editor-node-id="hero-section"
      data-editor-node-type="section"
      data-editor-node-label="Hero Section"
      className="relative flex min-h-screen w-full items-stretch overflow-hidden bg-black"
    >
      <div className="absolute inset-0 z-0">
        <motion.div
          style={{ scale: backgroundScale, y: backgroundY }}
          className="relative h-full w-full"
        >
          <div
            ref={heroBgRef}
            data-editor-node-id="hero-bg-image"
            data-editor-node-type="background"
            data-editor-media-kind="image"
            data-editor-node-label="Hero Background"
            className="absolute inset-0"
          >
            <Image
              src={content.bgUrl}
              alt="Tales for the Tillerman live atmosphere"
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: "center center" }}
            />
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-0 z-[1] bg-black/33" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-transparent to-black/58" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_62%,#00000088_12%,transparent_82%)]" />

      <motion.div
        animate={{ opacity: [0.10, 0.24, 0.10] }}
        transition={{ duration: 16, repeat: Infinity }}
        className="absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-[#FF8C21]/21 to-transparent"
      />

      <div className="relative z-10 flex min-h-screen w-full flex-col justify-end px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center pb-8 pt-16">
          <h1 
            ref={heroTitleRef}
            data-editor-node-id="hero-title"
            data-editor-node-type="text"
            data-editor-node-label="Título Principal"
            data-editor-title-mode={heroTitleMode}
            className="max-w-[880px] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.9rem] mb-6"
            style={getElementStyle(data.elementStyles, "hero-title")}
          >
            {heroTitleMode === "segmented"
              ? normalizedTitleSegments.map((segment, index) => (
                <span
                  key={`hero-segment-${index}`}
                  data-editor-segment-index={index}
                  data-editor-gradient-enabled={segment.gradientEnabled ? "true" : "false"}
                  data-editor-gradient-start={segment.gradientStart || ""}
                  data-editor-gradient-end={segment.gradientEnd || ""}
                  style={{
                    ...(segment.gradientEnabled
                      ? {
                          background: `linear-gradient(90deg, ${segment.gradientStart || "#FFB15A"}, ${segment.gradientEnd || "#FF6C00"})`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }
                      : { color: segment.color || "#ffffff" }),
                    fontWeight: segment.bold ? "700" : "400",
                    fontStyle: segment.italic ? "italic" : "normal",
                    textDecoration: segment.underline ? "underline" : "none",
                    opacity: segment.opacity ?? 1,
                    fontSize: segment.fontSize,
                    fontFamily: segment.fontFamily,
                    marginRight: "0.25em",
                  }}
                >
                  {segment.text}
                </span>
              ))
              : (
                <>
                  {content.title}{" "}
                  <span className="bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent">
                    {content.titleHighlight}
                  </span>
                </>
              )}
          </h1>

          <div className="flex flex-col items-center">
            <div
              ref={heroLogoRef}
              data-editor-node-id="hero-logo"
              data-editor-node-type="image"
              data-editor-node-label="Hero Logo"
              className="relative"
              style={{ width: 141, height: 141, ...getElementStyle(data.elementStyles, "hero-logo") }}
            >
              <Image
                src={content.logoUrl}
                alt="Tales for the Tillerman logo"
                fill
                priority
                className="object-contain drop-shadow-2xl"
                sizes="(min-width: 768px) 213px, 141px"
              />
            </div>
            <p 
              ref={heroSubtitleRef}
              data-editor-node-id="hero-subtitle"
              data-editor-node-type="text"
              data-editor-node-label="Subtítulo"
              className="mt-3 text-sm font-semibold uppercase tracking-[0.38em] text-[#ffd3a3]"
              style={getElementStyle(data.elementStyles, "hero-subtitle")}
            >
              {content.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={heroScrollRef}
        data-editor-node-id="hero-scroll-indicator"
        data-editor-node-type="card"
        data-editor-node-label="Scroll Indicator"
        data-editor-grouped="true"
        className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1 text-white/80"
      >
        <span className="text-lg uppercase tracking-[0.42em]">SCROLL</span>
        <svg className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={2.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>

      {isDebugMode && (
        <div className="absolute top-4 right-4 z-[9999] rounded-lg bg-black/80 px-3 py-2 text-left text-[10px] font-mono text-white/80 backdrop-blur-sm border border-white/10">
          <div className="font-bold text-white/90 mb-1">Hero Debug</div>
          <div>source: <span className="text-green-400">{debug.sourceUsed}</span></div>
          <div>title: <span className="text-yellow-300">{debug.titleValue || "(empty)"}</span></div>
          <div>titleHighlight: <span className="text-orange-400">{debug.titleHighlightValue || "(empty)"}</span></div>
          <div>segments: {debug.titleSegmentsCount}</div>
          {debug.segmentTexts.map((t, i) => (
            <div key={i} className="text-white/60 ml-2">  [{i}]: {t}</div>
          ))}
          <div>gradient fields: {debug.hasGradientFields ? "yes" : "no"}</div>
          <div className="mt-1 border-t border-white/10 pt-1">
            elementStyles keys:{" "}
            {data.elementStyles && Object.keys(data.elementStyles).length > 0
              ? Object.keys(data.elementStyles).join(", ")
              : "(none)"}
          </div>
        </div>
      )}
    </section>
  )
}
