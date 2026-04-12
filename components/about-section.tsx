"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"
import { useVisualEditor } from "@/components/visual-editor"
import { useDesktopLayoutOverridesEnabled } from "@/hooks/use-desktop-layout-overrides"
import type { CSSProperties } from "react"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

interface AboutSectionProps {
  className?: string
  overrides?: Record<string, HomeEditorNodeOverride>
}

function buildInlineStyleFromOverride(
  override: HomeEditorNodeOverride | undefined,
  includeGeometry: boolean
): CSSProperties | undefined {
  if (!override) return undefined
  const style: CSSProperties = {}
  const scale = typeof override.style.scale === "number" ? Math.max(0.1, override.style.scale) : 1
  if (includeGeometry && (override.explicitPosition || (override.explicitStyle && scale !== 1))) {
    style.transform =
      scale !== 1
        ? `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px) scale(${scale})`
        : `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px)`
    style.transformOrigin = "top left"
  }
  if (includeGeometry && override.explicitSize) {
    style.width = `${Math.max(8, Math.round(override.geometry.width))}px`
    style.height = `${Math.max(8, Math.round(override.geometry.height))}px`
  }
  if (override.explicitStyle) {
    if (override.style.opacity !== undefined) style.opacity = override.style.opacity
    if (override.style.backgroundColor) style.backgroundColor = override.style.backgroundColor
    if (override.style.color) style.color = override.style.color
    if (override.style.fontSize) style.fontSize = override.style.fontSize
    if (override.style.fontFamily) style.fontFamily = override.style.fontFamily
    if (override.style.fontWeight) style.fontWeight = override.style.fontWeight as CSSProperties["fontWeight"]
    if (override.style.fontStyle) style.fontStyle = override.style.fontStyle as CSSProperties["fontStyle"]
    if (override.style.textDecoration) style.textDecoration = override.style.textDecoration as CSSProperties["textDecoration"]
    if (override.style.minHeight) style.minHeight = override.style.minHeight
    if (override.style.paddingTop) style.paddingTop = override.style.paddingTop
    if (override.style.paddingBottom) style.paddingBottom = override.style.paddingBottom
  }
  return Object.keys(style).length > 0 ? style : undefined
}

function resolveTextOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const text = override.content.text?.trim()
  return text ? text : fallback
}

function resolveImageSrcOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const src = override.content.src?.trim()
  return src ? src : fallback
}

export function AboutSection({ className = "", overrides = {} }: AboutSectionProps) {
  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()
  const allowGeometryOverrides = useDesktopLayoutOverridesEnabled(isEditing)
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const textCardRef = useRef<HTMLDivElement>(null)
  const text1Ref = useRef<HTMLParagraphElement>(null)
  const text2Ref = useRef<HTMLParagraphElement>(null)
  const tagsRef = useRef<HTMLParagraphElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)

  const { opacity, y } = useScrollAnimation(sectionRef)
  const [copied, setCopied] = useState(false)
  const sectionOverride = overrides["about-section"]
  const bgOverride = overrides["about-bg-image"]
  // SectionHeader creates data-editor-node-id="about-header-title" (with -title suffix),
  // so the editor stores overrides under "about-header-title", not "about-header".
  const headerOverride = overrides["about-header-title"]
  const textCardOverride = overrides["about-text-card"]
  const text1Override = overrides["about-text-1"]
  const text2Override = overrides["about-text-2"]
  const tagsOverride = overrides["about-tags"]
  const copyButtonOverride = overrides["about-copy-button"]

  // Register editable elements - only on isEditing change, not on callback changes
  useEffect(() => {
    if (!isEditing) return

    const registerAll = () => {
      if (sectionRef.current) {
        const existing = getElementById('about-section')
        registerEditable({
          id: 'about-section',
          type: 'section',
          label: 'About Section',
          parentId: null,
          element: sectionRef.current,
          originalRect: sectionRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
        })
      }

      if (bgRef.current) {
        const existing = getElementById('about-bg-image')
        registerEditable({
          id: 'about-bg-image',
          type: 'image',
          label: 'About Background',
          parentId: null,
          element: bgRef.current,
          originalRect: bgRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: bgRef.current.offsetWidth, height: bgRef.current.offsetHeight },
        })
      }

      if (headerRef.current) {
        const existing = getElementById('about-header-title')
        registerEditable({
          id: 'about-header-title',
          type: 'text',
          label: 'About Header',
          parentId: null,
          element: headerRef.current,
          originalRect: headerRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: headerRef.current.offsetWidth, height: headerRef.current.offsetHeight },
        })
      }

      if (textCardRef.current) {
        const existing = getElementById('about-text-card')
        registerEditable({
          id: 'about-text-card',
          type: 'box',
          label: 'About Text Card',
          parentId: null,
          element: textCardRef.current,
          originalRect: textCardRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: textCardRef.current.offsetWidth, height: textCardRef.current.offsetHeight },
        })
      }

      if (text1Ref.current) {
        const existing = getElementById('about-text-1')
        registerEditable({
          id: 'about-text-1',
          type: 'text',
          label: 'About Text 1',
          parentId: null,
          element: text1Ref.current,
          originalRect: text1Ref.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: text1Ref.current.offsetWidth, height: text1Ref.current.offsetHeight },
        })
      }

      if (text2Ref.current) {
        const existing = getElementById('about-text-2')
        registerEditable({
          id: 'about-text-2',
          type: 'text',
          label: 'About Text 2',
          parentId: null,
          element: text2Ref.current,
          originalRect: text2Ref.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: text2Ref.current.offsetWidth, height: text2Ref.current.offsetHeight },
        })
      }

      if (tagsRef.current) {
        const existing = getElementById('about-tags')
        registerEditable({
          id: 'about-tags',
          type: 'text',
          label: 'About Tags',
          parentId: null,
          element: tagsRef.current,
          originalRect: tagsRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: tagsRef.current.offsetWidth, height: tagsRef.current.offsetHeight },
        })
      }

      if (copyButtonRef.current) {
        const existing = getElementById('about-copy-button')
        registerEditable({
          id: 'about-copy-button',
          type: 'button',
          label: 'Copy Bio Button',
          parentId: null,
          element: copyButtonRef.current,
          originalRect: copyButtonRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: copyButtonRef.current.offsetWidth, height: copyButtonRef.current.offsetHeight },
        })
      }
    }

    registerAll()

    return () => {
      unregisterEditable('about-section')
      unregisterEditable('about-bg-image')
      unregisterEditable('about-header-title')
      unregisterEditable('about-text-card')
      unregisterEditable('about-text-1')
      unregisterEditable('about-text-2')
      unregisterEditable('about-tags')
      unregisterEditable('about-copy-button')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const bioText = `Tales for the Tillerman is a Berlin-based collective blending world music, funk, soul, and reggae into a vibrant live experience. With roots spanning across continents, the band creates a sound that moves between groove, warmth, rhythm, and energy.

Their performances balance musical depth with danceable power, bringing together five musicians into one fluid, dynamic live act. Based in Berlin, the project brings together world music fusion, stage energy, and a strong collective identity.

5 musicians • Berlin-based • World music fusion • Live experience`

  const copyBio = async () => {
    if (isEditing) return
    try {
      await navigator.clipboard.writeText(bioText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      console.error("Copy failed", error)
    }
  }

  const aboutHeaderTitle = resolveTextOverride(headerOverride, "A Journey Through Sound")
  const aboutText1 = resolveTextOverride(
    text1Override,
    "Tales for the Tillerman is a Berlin-based collective blending world music, funk, soul, and reggae into a vibrant live experience. With roots spanning across continents, the band creates a sound that moves between groove, warmth, rhythm, and energy."
  )
  const aboutText2 = resolveTextOverride(
    text2Override,
    "Their performances balance musical depth with danceable power, bringing together five musicians into one fluid, dynamic live act. Based in Berlin, the project brings together world music fusion, stage energy, and a strong collective identity."
  )
  const aboutTags = resolveTextOverride(tagsOverride, "5 musicians • Berlin-based • World music fusion • Live experience")
  const aboutCopyLabel = resolveTextOverride(copyButtonOverride, copied ? "✓ Copied to clipboard" : "Copy band bio")
  const aboutBgSrc = resolveImageSrcOverride(bgOverride, "/images/about-bg-main.jpg")

  return (
    <section 
      ref={sectionRef} 
      data-editor-node-id="about-section"
      data-editor-node-type="section"
      data-editor-node-label="Sección Sobre Nosotros"
      className={`relative isolate min-h-screen w-full overflow-hidden bg-black ${className}`}
      style={buildInlineStyleFromOverride(sectionOverride, allowGeometryOverrides)}
    >
      <div 
        ref={bgRef}
        data-editor-node-id="about-bg-image"
        data-editor-node-type="background"
        data-editor-media-kind="image"
        data-editor-node-label="Imagen de fondo"
        className="absolute inset-0 z-0"
        style={buildInlineStyleFromOverride(bgOverride, allowGeometryOverrides)}
      >
        <Image
          src={aboutBgSrc}
          alt="Band members background"
          fill
          className="object-cover"
          style={{ objectPosition: "center top" }}
        />
      </div>

      <div className="section-photo-scrim z-10" />
      <div className="section-photo-fade-top z-10" />
      <div className="section-photo-fade-bottom z-10" />

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen min-h-[100dvh] items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div 
          style={isEditing ? undefined : { opacity, y }} 
          className="mx-auto w-full max-w-4xl"
        >
          <div ref={headerRef} style={buildInlineStyleFromOverride(headerOverride, allowGeometryOverrides)}>
            <SectionHeader
              eyebrow="About the Band"
              title={aboutHeaderTitle}
              titleClassName="text-white"
              className="mb-10 max-w-4xl md:mb-12"
              dataEditId="about-header"
              dataEditLabel="Sección Sobre Nosotros"
            />
          </div>

          {/* Box de texto reducido ~20% */}
          {isEditing ? (
            <div
              ref={textCardRef}
              data-editor-node-id="about-text-card"
              data-editor-node-type="card"
              data-editor-node-label="About Text Card"
              className="w-full rounded-3xl border border-white/10 bg-black/50 px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14 shadow-2xl backdrop-blur-md"
              style={buildInlineStyleFromOverride(textCardOverride, allowGeometryOverrides)}
            >
              <div className="space-y-6 text-white md:space-y-8">
                <p
                  ref={text1Ref}
                  data-editor-node-id="about-text-1"
                  data-editor-node-type="text"
                  data-editor-node-label="Descripción 1"
                  className="mb-0 max-w-none text-base leading-relaxed text-white/95 md:text-lg"
                  style={buildInlineStyleFromOverride(text1Override, allowGeometryOverrides)}
                >
                  {aboutText1}
                </p>
                <p
                  ref={text2Ref}
                  data-editor-node-id="about-text-2"
                  data-editor-node-type="text"
                  data-editor-node-label="Descripción 2"
                  className="mb-0 max-w-none text-base leading-relaxed text-white/90 md:text-lg"
                  style={buildInlineStyleFromOverride(text2Override, allowGeometryOverrides)}
                >
                  {aboutText2}
                </p>
                <p
                  ref={tagsRef}
                  data-editor-node-id="about-tags"
                  data-editor-node-type="text"
                  data-editor-node-label="Etiquetas"
                  className="mb-0 max-w-none pt-2 text-sm leading-relaxed md:text-base text-[#FF8C21]"
                  style={buildInlineStyleFromOverride(tagsOverride, allowGeometryOverrides)}
                >
                  {aboutTags}
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              ref={textCardRef}
              data-editor-node-id="about-text-card"
              data-editor-node-type="card"
              data-editor-node-label="About Text Card"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="w-full rounded-3xl border border-white/10 bg-black/50 px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14 shadow-2xl backdrop-blur-md"
              style={buildInlineStyleFromOverride(textCardOverride, allowGeometryOverrides)}
            >
              <div className="space-y-6 text-white md:space-y-8">
                <p
                  ref={text1Ref}
                  data-editor-node-id="about-text-1"
                  data-editor-node-type="text"
                  data-editor-node-label="Descripción 1"
                  className="mb-0 max-w-none text-base leading-relaxed text-white/95 md:text-lg"
                  style={buildInlineStyleFromOverride(text1Override, allowGeometryOverrides)}
                >
                  {aboutText1}
                </p>
                <p
                  ref={text2Ref}
                  data-editor-node-id="about-text-2"
                  data-editor-node-type="text"
                  data-editor-node-label="Descripción 2"
                  className="mb-0 max-w-none text-base leading-relaxed text-white/90 md:text-lg"
                  style={buildInlineStyleFromOverride(text2Override, allowGeometryOverrides)}
                >
                  {aboutText2}
                </p>
                <p
                  ref={tagsRef}
                  data-editor-node-id="about-tags"
                  data-editor-node-type="text"
                  data-editor-node-label="Etiquetas"
                  className="mb-0 max-w-none pt-2 text-sm leading-relaxed md:text-base text-[#FF8C21]"
                  style={buildInlineStyleFromOverride(tagsOverride, allowGeometryOverrides)}
                >
                  {aboutTags}
                </p>
              </div>
            </motion.div>
          )}

          <div className="mt-12 flex justify-center">
            {isEditing ? (
              <button
                ref={copyButtonRef}
                type="button"
                onClick={copyBio}
                data-editor-node-id="about-copy-button"
                data-editor-node-type="button"
                data-editor-node-label="Copy Bio Button"
                className="inline-flex items-center justify-center rounded-2xl border border-[#FF8C21]/70 bg-[#FF8C21]/90 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#FF8C21]/30 md:text-lg"
                style={buildInlineStyleFromOverride(copyButtonOverride, allowGeometryOverrides)}
              >
                {aboutCopyLabel}
              </button>
            ) : (
              <motion.button
                ref={copyButtonRef}
                type="button"
                onClick={copyBio}
                whileTap={{ scale: 0.98 }}
                animate={copied ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                data-editor-node-id="about-copy-button"
                data-editor-node-type="button"
                data-editor-node-label="Copy Bio Button"
                className={`inline-flex items-center justify-center rounded-2xl border px-8 py-3.5 text-base font-semibold shadow-lg md:text-lg ${
                  copied
                    ? "border-[#FF8C21] bg-[#FF8C21] text-white shadow-[#FF8C21]/50"
                    : "border-[#FF8C21]/70 bg-[#FF8C21]/90 text-white shadow-[#FF8C21]/30 transition-all hover:bg-[#FF8C21] hover:shadow-[#FF8C21]/40"
                }`}
                style={buildInlineStyleFromOverride(copyButtonOverride, allowGeometryOverrides)}
              >
                {aboutCopyLabel}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
