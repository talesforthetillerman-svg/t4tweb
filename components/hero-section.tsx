"use client"

import { useRef, useEffect, useMemo, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import { useVisualEditor } from "@/components/visual-editor"
import { useHomeEditorImageSrc } from "@/components/home-editor-overrides-provider"
import type { HeroData } from "@/lib/sanity/hero-loader"


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

  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()

  // Sync debug mode from query param (client-side only after hydration)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setIsDebugMode(params.get("heroDebug") === "1")
  }, [isEditing])

  // Apply persisted element styles to public render
  useEffect(() => {
    if (isEditing || !data.elementStyles) return

    const applyStyles = (targetId: string, styles: Record<string, unknown>) => {
      // For hero-title internal spans, search by data-editor-internal-id instead
      const isInternalSpan = targetId === "hero-title-main" || targetId === "hero-title-accent"
      const selector = isInternalSpan
        ? `[data-editor-internal-id="${targetId}"]`
        : `[data-editor-node-id="${targetId}"]`
      const element = document.querySelector(selector) as HTMLElement
      if (!element) return

      // Text styles
      if (targetId === "hero-title-main" || targetId === "hero-title-accent") {
        if (typeof styles.color === "string") element.style.color = styles.color
        if (typeof styles.fontSize === "string") element.style.fontSize = styles.fontSize
        if (typeof styles.fontWeight === "string" || typeof styles.fontWeight === "number") element.style.fontWeight = String(styles.fontWeight)
        if (styles.bold === true) element.style.fontWeight = "700"
        if (styles.italic === true) element.style.fontStyle = "italic"
        if (styles.underline === true) element.style.textDecoration = "underline"
        if (typeof styles.opacity === "number") element.style.opacity = String(styles.opacity)
        // Gradient override
        if (styles.gradientEnabled === true && typeof styles.gradientStart === "string" && typeof styles.gradientEnd === "string") {
          element.style.background = `linear-gradient(to right, ${styles.gradientStart}, ${styles.gradientEnd})`
          element.style.backgroundClip = "text"
          element.style.webkitBackgroundClip = "text"
          element.style.color = "transparent"
          element.style.webkitTextFillColor = "transparent"
        }
      }

      // Position and size
      if (typeof styles.x === "number") element.style.transform = (element.style.transform || "") + ` translateX(${styles.x}px)`
      if (typeof styles.y === "number") element.style.transform = (element.style.transform || "") + ` translateY(${styles.y}px)`
      if (typeof styles.width === "number") element.style.width = `${styles.width}px`
      if (typeof styles.height === "number") element.style.height = `${styles.height}px`
      if (typeof styles.scale === "number") element.style.transform = (element.style.transform || "") + ` scale(${styles.scale})`

      // Image effects
      if (targetId === "hero-bg-image" || targetId === "hero-logo") {
        let filter = ""
        if (typeof styles.contrast === "number") filter += ` contrast(${styles.contrast})`
        if (typeof styles.saturation === "number") filter += ` saturate(${styles.saturation})`
        if (typeof styles.brightness === "number") filter += ` brightness(${styles.brightness})`
        if (styles.negative === true) filter += " invert(1)"
        if (filter) element.style.filter = filter.trim()
        if (typeof styles.opacity === "number") element.style.opacity = String(styles.opacity)
      }
    }

    for (const [targetId, styles] of Object.entries(data.elementStyles)) {
      applyStyles(targetId, styles as Record<string, unknown>)
    }
  }, [data.elementStyles, isEditing])

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
          type: 'group',
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
  const resolvedHeroBgSrc = useHomeEditorImageSrc("hero-bg-image", content.bgUrl)
  const resolvedHeroLogoSrc = useHomeEditorImageSrc("hero-logo", content.logoUrl)

  const mainTitleText = content.title || ""
  const accentTitleText = content.titleHighlight || ""
  const scrollLabelText = content.scrollLabel || "SCROLL"

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
              src={resolvedHeroBgSrc}
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

      <div className="absolute inset-0 z-[1] bg-black/33" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-transparent to-black/58" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_62%,#00000088_12%,transparent_82%)]" />

      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-[#FF8C21]/21 to-transparent animate-hero-shine" />

      <div className="relative z-10 flex min-h-screen min-h-[100dvh] w-full flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center pb-6 pt-8 text-center sm:pb-8 sm:pt-12">
          <h1
            ref={heroTitleRef}
            data-editor-node-id="hero-title"
            data-editor-node-type="group"
            data-editor-node-label="Hero Title"
            className="max-w-[880px] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.9rem] mb-6"
          >
            <span
              data-editor-internal-id="hero-title-main"
              className="mr-[0.25em]"
            >
              {mainTitleText}
            </span>
            <span
              data-editor-internal-id="hero-title-accent"
              className="bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent"
            >
              {accentTitleText}
            </span>
          </h1>
          <div
            ref={heroLogoRef}
            data-editor-node-id="hero-logo"
            data-editor-node-type="image"
            data-editor-node-label="Hero Logo"
            className="relative mt-2 mb-4"
            style={{
              width: "clamp(6rem, 22vw, 8.8125rem)",
              height: "clamp(6rem, 22vw, 8.8125rem)",
            }}
          >
            <Image
              src={resolvedHeroLogoSrc}
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
            className="mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent sm:text-xs sm:tracking-[0.3em]"
          >
            {content.subtitle}
          </p>

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
        </div>
      </div>

      <div 
        ref={heroScrollRef}
        data-editor-node-id="hero-scroll-indicator"
        data-editor-node-type="card"
        data-editor-node-label="Scroll Indicator"
        data-editor-grouped="true"
        className="absolute bottom-12 left-1/2 z-30 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1 text-white/60"
      >
        <span className="text-lg uppercase tracking-[0.42em]">{scrollLabelText}</span>
        <svg className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={2.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>

      {isDebugMode && (
        <div className="absolute top-4 right-4 z-[9999] rounded-lg bg-black/80 px-3 py-2 text-left text-[10px] font-mono text-white/80 backdrop-blur-sm border border-white/10">
          <div className="font-bold text-white/90 mb-1">Hero Debug</div>
          <div>title: <span className="text-yellow-300">{mainTitleText || "(empty)"}</span></div>
          <div>titleHighlight: <span className="text-orange-400">{accentTitleText || "(empty)"}</span></div>
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
