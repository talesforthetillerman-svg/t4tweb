"use client"

import { useRef, useEffect, useMemo, useState, type CSSProperties } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import { useVisualEditor } from "@/components/visual-editor"
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
import type { HeroData } from "@/lib/sanity/hero-loader"

function getRawElementStyle(elementStyles: HeroData["elementStyles"], targetId: string): Record<string, unknown> {
  const value = elementStyles?.[targetId]
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function getHeroSectionHeight(elementStyles: HeroData["elementStyles"]): number {
  const section = getRawElementStyle(elementStyles, "hero-section")
  return typeof section.height === "number" && section.height > 0 ? section.height : 900
}

function getHeroSectionFrameStyle(elementStyles: HeroData["elementStyles"]): CSSProperties {
  const section = getRawElementStyle(elementStyles, "hero-section")
  const height = section.height
  if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) return {}

  return {
    minHeight: `max(100dvh, ${Math.round(height)}px)`,
  }
}

function hasBrokenHeroScrollGeometry(styles: Record<string, unknown>, elementStyles: HeroData["elementStyles"]): boolean {
  const section = getRawElementStyle(elementStyles, "hero-section")
  const sectionWidth = typeof section.width === "number" && section.width > 0 ? section.width : 1440
  const sectionHeight = getHeroSectionHeight(elementStyles)
  const x = styles.x
  const y = styles.y

  return (
    (typeof x === "number" && Math.abs(x) > sectionWidth * 0.25) ||
    (typeof y === "number" && Math.abs(y) > sectionHeight * 0.5)
  )
}

function hasUsableHeroTextGeometry(styles: Record<string, unknown>, elementStyles: HeroData["elementStyles"]): boolean {
  const sectionHeight = getHeroSectionHeight(elementStyles)
  const x = styles.x
  const y = styles.y
  const width = styles.width
  const height = styles.height

  return (
    typeof x === "number" &&
    typeof y === "number" &&
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    Math.abs(x) <= 2400 &&
    Math.abs(y) <= sectionHeight * 0.9 &&
    width > 1 &&
    height > 1 &&
    width <= 2400 &&
    height <= 800
  )
}

function applyLegacyTextStyleFields(result: CSSProperties, styles: Record<string, unknown>): CSSProperties {
  if (typeof styles.fontSize === "string" && styles.fontSize.trim()) result.fontSize = styles.fontSize
  if (typeof styles.fontWeight === "string" && styles.fontWeight.trim()) result.fontWeight = styles.fontWeight
  if (typeof styles.fontStyle === "string" && styles.fontStyle !== "normal") result.fontStyle = styles.fontStyle
  if (typeof styles.textDecoration === "string" && styles.textDecoration !== "none") result.textDecoration = styles.textDecoration
  if (typeof styles.lineHeight === "string" && styles.lineHeight.trim()) result.lineHeight = styles.lineHeight
  if (typeof styles.letterSpacing === "string" && styles.letterSpacing.trim() && styles.letterSpacing !== "normal") {
    result.letterSpacing = styles.letterSpacing
  }
  if (typeof styles.textAlign === "string" && styles.textAlign.trim()) result.textAlign = styles.textAlign as CSSProperties["textAlign"]
  return result
}

function getHeroTextPatternStyle(elementStyles: HeroData["elementStyles"], targetId: string): CSSProperties {
  const styles = getRawElementStyle(elementStyles, targetId)
  return applyLegacyTextStyleFields(
    getElementLayoutStyle(elementStyles, targetId, { includeGeometry: hasUsableHeroTextGeometry(styles, elementStyles) }),
    styles
  )
}

function getHeroScrollIndicatorStyle(elementStyles: HeroData["elementStyles"]): CSSProperties {
  const styles = getRawElementStyle(elementStyles, "hero-scroll-indicator")
  return getElementLayoutStyle(elementStyles, "hero-scroll-indicator", {
    includeGeometry: !hasBrokenHeroScrollGeometry(styles, elementStyles),
  })
}

function isLegacyWashedHeroBackgroundStyle(styles: Record<string, unknown>): boolean {
  const contrast = styles.contrast
  const saturation = styles.saturation
  const brightness = styles.brightness

  return (
    contrast === 50 &&
    saturation === 50 &&
    brightness === 50 &&
    (styles.opacity === undefined || styles.opacity === 1) &&
    (styles.negative === undefined || styles.negative === false)
  )
}

function getHeroBackgroundImageStyle(elementStyles: HeroData["elementStyles"]): CSSProperties {
  const rawStyles = getRawElementStyle(elementStyles, "hero-bg-image")
  if (!isLegacyWashedHeroBackgroundStyle(rawStyles)) {
    return getElementLayoutStyle(elementStyles, "hero-bg-image")
  }

  return getElementLayoutStyle(
    {
      ...(elementStyles || {}),
      "hero-bg-image": {
        ...rawStyles,
        contrast: 100,
        saturation: 100,
        brightness: 100,
        opacity: 1,
        negative: false,
      },
    },
    "hero-bg-image"
  )
}

export function HeroSection({ data }: { data: HeroData }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isDebugMode, setIsDebugMode] = useState(false)

  // Editable refs
  const heroSectionRef = useRef<HTMLElement>(null)
  const heroBgRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroLogoRef = useRef<HTMLDivElement>(null)
  const heroSubtitleRef = useRef<HTMLParagraphElement>(null)
  const heroButtonsRef = useRef<HTMLDivElement>(null)
  const heroScrollRef = useRef<HTMLDivElement>(null)
  const heroScrollLabelRef = useRef<HTMLSpanElement>(null)

  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()

  // Sync debug mode from query param (client-side only after hydration)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setIsDebugMode(params.get("heroDebug") === "1")
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

      if (heroScrollLabelRef.current) {
        const existing = getElementById('hero-scroll-label')
        registerEditable({
          id: 'hero-scroll-label',
          type: 'text',
          label: 'Scroll Label',
          parentId: 'hero-scroll-indicator',
          element: heroScrollLabelRef.current,
          originalRect: heroScrollLabelRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: heroScrollLabelRef.current.offsetWidth, height: heroScrollLabelRef.current.offsetHeight },
        })
      }
    }

    registerAll()

    return () => {
      unregisterEditable('hero-section')
      unregisterEditable('hero-bg-image')
      unregisterEditable('hero-title')
      unregisterEditable('hero-logo')
      unregisterEditable('hero-subtitle')
      unregisterEditable('hero-buttons')
      unregisterEditable('hero-scroll-indicator')
      unregisterEditable('hero-scroll-label')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const staticScale = 1
  const staticY = 0

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [staticScale, 1.06])
  const backgroundY = useTransform(scrollYProgress, [0, 1], [staticY, 35])

  const content = data

  const mainTitleText = content.title || ""
  const scrollLabelText = content.scrollLabel || "SCROLL"
  const heroFrameStyle = getHeroSectionFrameStyle(data.elementStyles)

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
      className="relative flex min-h-screen min-h-[100dvh] w-full items-stretch overflow-hidden bg-black"
      style={heroFrameStyle}
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
            style={getHeroBackgroundImageStyle(data.elementStyles)}
          >
            <Image
              src={content.bgUrl}
              alt="Tales for the Tillerman live atmosphere"
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: "center 15%" }}
            />
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-36 bg-gradient-to-b from-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/2 bg-gradient-to-t from-black/42 via-black/10 to-transparent" />

      <div className="relative z-10 flex min-h-screen min-h-[100dvh] w-full flex-col justify-center px-4 sm:px-6 lg:px-8" style={heroFrameStyle}>
        <div className="flex flex-col items-center pb-6 pt-8 text-center sm:pb-8 sm:pt-12">
          <h1
            ref={heroTitleRef}
            data-editor-node-id="hero-title"
            data-editor-node-type="text"
            data-editor-node-label="Hero Title"
            className="max-w-[880px] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.9rem] mb-6"
            style={getHeroTextPatternStyle(data.elementStyles, "hero-title")}
          >
            {mainTitleText}
          </h1>
          <div
            ref={heroLogoRef}
            data-editor-node-id="hero-logo"
            data-editor-node-type="image"
            data-editor-node-label="Hero Logo"
            className="relative mt-2 mb-4 overflow-hidden"
            style={{
              ...{
                width: "clamp(7rem, 24vw, 10rem)",
                height: "clamp(7rem, 24vw, 10rem)",
              },
              ...getElementLayoutStyle(data.elementStyles, "hero-logo"),
            }}
          >
            <Image
              src={content.logoUrl}
              alt="Tales for the Tillerman logo"
              fill
              priority
              className="object-contain"
              sizes="(min-width: 768px) 213px, 141px"
            />
          </div>
          <p
            ref={heroSubtitleRef}
            data-editor-node-id="hero-subtitle"
            data-editor-node-type="text"
            data-editor-node-label="Subtítulo"
            className="mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent sm:text-xs sm:tracking-[0.3em]"
            style={getHeroTextPatternStyle(data.elementStyles, "hero-subtitle")}
          >
            {content.subtitle}
          </p>

          {/* DISABLED: Hero buttons temporarily disabled until Sanity is cleaned of residual data
          {content.ctaButtons && content.ctaButtons.length > 0 && (
            <div
              ref={heroButtonsRef}
              data-editor-node-id="hero-buttons"
              data-editor-node-type="box"
              data-editor-node-label="Hero Buttons"
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              {content.ctaButtons.map((btn, i) => (
                <a
                  key={i}
                  href={btn.href || "#"}
                  className={`inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${
                    btn.variant === "primary"
                      ? "bg-gradient-to-r from-[#FF8C21] via-[#FF7C00] to-[#FF6C00] text-white shadow-lg shadow-[#FF8C21]/20 hover:shadow-xl hover:shadow-[#FF8C21]/30"
                      : "border border-white/30 text-white hover:border-white/60 hover:bg-white/10"
                  }`}
                >
                  {btn.label}
                </a>
              ))}
            </div>
          )}
          */}
        </div>
      </div>

      <div
        ref={heroScrollRef}
        data-editor-node-id="hero-scroll-indicator"
        data-editor-node-type="card"
        data-editor-node-label="Scroll Indicator"
        data-editor-grouped="true"
        className="absolute bottom-10 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2 text-white/80"
        style={getHeroScrollIndicatorStyle(data.elementStyles)}
      >
        <span
          ref={heroScrollLabelRef}
          data-editor-node-id="hero-scroll-label"
          data-editor-node-type="text"
          data-editor-node-label="Scroll Label"
          className="text-xs font-medium uppercase tracking-[0.35em] text-white/90"
          style={getHeroTextPatternStyle(data.elementStyles, "hero-scroll-label")}
        >
          {scrollLabelText}
        </span>
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-b from-[#FF8C21]/20 to-transparent blur-sm" />
          <svg className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
      </div>

      {isDebugMode && (
        <div className="absolute top-4 right-4 z-[9999] rounded-lg bg-black/80 px-3 py-2 text-left text-[10px] font-mono text-white/80 backdrop-blur-sm border border-white/10">
          <div className="font-bold text-white/90 mb-1">Hero Debug</div>
          <div>title: <span className="text-yellow-300">{mainTitleText || "(empty)"}</span></div>
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
