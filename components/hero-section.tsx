"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import { client } from "@/lib/sanity/client"
import { heroQuery } from "@/lib/sanity/queries"
import { useVisualEditor } from "@/components/visual-editor"

const FALLBACK = {
  title: "A vibrant blend of",
  titleHighlight: "funk, soul and world music",
  subtitle: "BERLIN-BASED LIVE COLLECTIVE",
  logoUrl: "/images/t4tPics/logo-white.png",
  bgUrl: "/images/t4tPics/hero-bg.jpg",
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [data, setData] = useState<typeof FALLBACK | null>(null)

  // Editable refs
  const heroSectionRef = useRef<HTMLElement>(null)
  const heroBgRef = useRef<HTMLDivElement>(null)
  const heroLogoRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroSubtitleRef = useRef<HTMLParagraphElement>(null)
  const heroButtonsRef = useRef<HTMLDivElement>(null)
  const heroScrollRef = useRef<HTMLDivElement>(null)

  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()

  // Register editable elements
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

    // Update positions on scroll/resize
    const updatePositions = () => {
      registerAll()
    }

    window.addEventListener('scroll', updatePositions)
    window.addEventListener('resize', updatePositions)

    return () => {
      window.removeEventListener('scroll', updatePositions)
      window.removeEventListener('resize', updatePositions)
      unregisterEditable('hero-section')
      unregisterEditable('hero-bg-image')
      unregisterEditable('hero-logo')
      unregisterEditable('hero-title')
      unregisterEditable('hero-subtitle')
      unregisterEditable('hero-buttons')
      unregisterEditable('hero-scroll-indicator')
    }
  }, [isEditing, registerEditable, unregisterEditable])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.06])
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 35])

  useEffect(() => {
    client.fetch(heroQuery).then((data) => {
      if (data && (data.bgUrl || data.title)) {
        setData({
          title: data.title || FALLBACK.title,
          titleHighlight: data.titleHighlight || FALLBACK.titleHighlight,
          subtitle: data.subtitle || FALLBACK.subtitle,
          logoUrl: data.logoUrl || FALLBACK.logoUrl,
          bgUrl: data.bgUrl || FALLBACK.bgUrl,
        })
      } else {
        setData(FALLBACK)
      }
    }).catch(() => setData(FALLBACK))
  }, [])

  const content = data || FALLBACK

  return (
    <section
      ref={(el) => {
        sectionRef.current = el
        heroSectionRef.current = el
      }}
      id="top"
      className="relative flex min-h-screen w-full items-stretch overflow-hidden bg-black"
    >
      <div className="absolute inset-0 z-0">
        <motion.div
          style={{ scale: backgroundScale, y: backgroundY }}
          className="relative h-full w-full"
        >
          <div
            ref={heroBgRef}
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
            data-edit-id="hero-title"
            data-edit-type="text"
            data-edit-label="Título Principal"
            className="max-w-[880px] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.9rem] mb-6"
          >
            {content.title}{" "}
            <span className="bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent">
              {content.titleHighlight}
            </span>
          </h1>

          <div className="flex flex-col items-center">
            <div
              ref={heroLogoRef}
              className="relative"
              style={{ width: 141, height: 141 }}
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
              data-edit-id="hero-subtitle"
              data-edit-type="text"
              data-edit-label="Subtítulo"
              className="mt-3 text-sm font-semibold uppercase tracking-[0.38em] text-[#ffd3a3]"
            >
              {content.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={heroScrollRef}
        className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 hidden sm:flex items-center gap-3 text-white/80"
      >
        <span className="text-lg uppercase tracking-[0.42em]">SCROLL</span>
        <svg className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={2.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>
    </section>
  )
}
