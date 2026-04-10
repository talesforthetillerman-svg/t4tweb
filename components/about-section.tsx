"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"
import { useVisualEditor } from "@/components/visual-editor"

export function AboutSection({ className = "" }: { className?: string }) {
  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()
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
        const existing = getElementById('about-header')
        registerEditable({
          id: 'about-header',
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
      unregisterEditable('about-header')
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

  return (
    <section 
      ref={sectionRef} 
      data-editor-node-id="about-section"
      data-editor-node-type="section"
      data-editor-node-label="Sección Sobre Nosotros"
      className={`relative isolate min-h-screen w-full overflow-hidden bg-black ${className}`}
    >
      <div 
        ref={bgRef}
        data-editor-node-id="about-bg-image"
        data-editor-node-type="background"
        data-editor-media-kind="image"
        data-editor-node-label="Imagen de fondo"
        className="absolute inset-0 z-0"
      >
        <Image
          src="/images/about-bg-main.jpg"
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
          <div ref={headerRef}>
            <SectionHeader
              eyebrow="About the Band"
              title="A Journey Through Sound"
              titleClassName="text-white"
              className="mb-10 max-w-4xl md:mb-12"
              dataEditId="about-header"
              dataEditLabel="Sección Sobre Nosotros"
            />
          </div>

          {/* Box de texto reducido ~20% */}
          <motion.div
            ref={textCardRef}
            data-editor-node-id="about-text-card"
            data-editor-node-type="card"
            data-editor-node-label="About Text Card"
            initial={isEditing ? false : { opacity: 0, y: 16 }}
            whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
            viewport={isEditing ? undefined : { once: true, amount: 0.2 }}
            transition={isEditing ? undefined : { duration: 0.6, delay: 0.05 }}
            className="w-full rounded-3xl border border-white/10 bg-black/50 px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14 shadow-2xl backdrop-blur-md"
          >
            <div className="space-y-6 text-white md:space-y-8">
              <p 
                ref={text1Ref}
                data-editor-node-id="about-text-1"
                data-editor-node-type="text"
                data-editor-node-label="Descripción 1"
                className="mb-0 max-w-none text-base leading-relaxed text-white/95 md:text-lg"
              >
                Tales for the Tillerman is a Berlin-based collective blending world music, 
                funk, soul, and reggae into a vibrant live experience. With roots spanning 
                across continents, the band creates a sound that moves between groove, 
                warmth, rhythm, and energy.
              </p>

              <p 
                ref={text2Ref}
                data-editor-node-id="about-text-2"
                data-editor-node-type="text"
                data-editor-node-label="Descripción 2"
                className="mb-0 max-w-none text-base leading-relaxed text-white/90 md:text-lg"
              >
                Their performances balance musical depth with danceable power, bringing 
                together five musicians into one fluid, dynamic live act. Based in Berlin, 
                the project brings together world music fusion, stage energy, and a strong 
                collective identity.
              </p>

              <p 
                ref={tagsRef}
                data-editor-node-id="about-tags"
                data-editor-node-type="text"
                data-editor-node-label="Etiquetas"
                className="mb-0 max-w-none pt-2 text-sm leading-relaxed md:text-base text-[#FF8C21]"
              >
                5 musicians • Berlin-based • World music fusion • Live experience
              </p>
            </div>
          </motion.div>

          <div className="mt-12 flex justify-center">
            <motion.button
              ref={copyButtonRef}
              type="button"
              onClick={copyBio}
              whileTap={isEditing ? undefined : { scale: 0.98 }}
              animate={isEditing ? undefined : (copied ? { scale: [1, 1.04, 1] } : { scale: 1 })}
              transition={isEditing ? undefined : { duration: 0.3 }}
              data-editor-node-id="about-copy-button"
              data-editor-node-type="button"
              data-editor-node-label="Copy Bio Button"
              className={`inline-flex items-center justify-center rounded-2xl border px-8 py-3.5 text-base font-semibold shadow-lg md:text-lg ${
                copied
                  ? "border-[#FF8C21] bg-[#FF8C21] text-white shadow-[#FF8C21]/50"
                  : isEditing
                    ? "border-[#FF8C21]/70 bg-[#FF8C21]/90 text-white shadow-[#FF8C21]/30"
                    : "border-[#FF8C21]/70 bg-[#FF8C21]/90 text-white shadow-[#FF8C21]/30 transition-all hover:bg-[#FF8C21] hover:shadow-[#FF8C21]/40"
              }`}
            >
              {copied ? "✓ Copied to clipboard" : "Copy band bio"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
