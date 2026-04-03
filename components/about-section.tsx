"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"
import { useVisualEditor } from "@/components/visual-editor"

export function AboutSection({ className = "" }: { className?: string }) {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const textBoxRef = useRef<HTMLDivElement>(null)
  const text1Ref = useRef<HTMLParagraphElement>(null)
  const text2Ref = useRef<HTMLParagraphElement>(null)
  const tagsRef = useRef<HTMLParagraphElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)

  const { opacity, y } = useScrollAnimation(sectionRef)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isEditing) return

    if (sectionRef.current) {
      registerEditable({
        id: 'about-section',
        type: 'section',
        label: 'About Section',
        parentId: null,
        element: sectionRef.current,
        originalRect: sectionRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
      })
    }

    if (bgRef.current) {
      registerEditable({
        id: 'about-bg-image',
        type: 'image',
        label: 'About Background',
        parentId: 'about-section',
        element: bgRef.current,
        originalRect: bgRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bgRef.current.offsetWidth, height: bgRef.current.offsetHeight },
      })
    }

    if (headerRef.current) {
      registerEditable({
        id: 'about-header',
        type: 'text',
        label: 'About Header',
        parentId: 'about-section',
        element: headerRef.current,
        originalRect: headerRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: headerRef.current.offsetWidth, height: headerRef.current.offsetHeight },
      })
    }

    if (textBoxRef.current) {
      registerEditable({
        id: 'about-text-box',
        type: 'box',
        label: 'About Text Box',
        parentId: 'about-section',
        element: textBoxRef.current,
        originalRect: textBoxRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: textBoxRef.current.offsetWidth, height: textBoxRef.current.offsetHeight },
      })
    }

    if (text1Ref.current) {
      registerEditable({
        id: 'about-text-1',
        type: 'text',
        label: 'About Text 1',
        parentId: 'about-section',
        element: text1Ref.current,
        originalRect: text1Ref.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: text1Ref.current.offsetWidth, height: text1Ref.current.offsetHeight },
      })
    }

    if (text2Ref.current) {
      registerEditable({
        id: 'about-text-2',
        type: 'text',
        label: 'About Text 2',
        parentId: 'about-section',
        element: text2Ref.current,
        originalRect: text2Ref.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: text2Ref.current.offsetWidth, height: text2Ref.current.offsetHeight },
      })
    }

    if (tagsRef.current) {
      registerEditable({
        id: 'about-tags',
        type: 'text',
        label: 'About Tags',
        parentId: 'about-section',
        element: tagsRef.current,
        originalRect: tagsRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: tagsRef.current.offsetWidth, height: tagsRef.current.offsetHeight },
      })
    }

    if (copyButtonRef.current) {
      registerEditable({
        id: 'about-copy-button',
        type: 'button',
        label: 'Copy Bio Button',
        parentId: 'about-section',
        element: copyButtonRef.current,
        originalRect: copyButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: copyButtonRef.current.offsetWidth, height: copyButtonRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('about-section')
      unregisterEditable('about-bg-image')
      unregisterEditable('about-header')
      unregisterEditable('about-text-box')
      unregisterEditable('about-text-1')
      unregisterEditable('about-text-2')
      unregisterEditable('about-tags')
      unregisterEditable('about-copy-button')
    }
  }, [isEditing, registerEditable, unregisterEditable])

  const bioText = `Tales for the Tillerman is a Berlin-based collective blending world music, funk, soul, and reggae into a vibrant live experience. With roots spanning across continents, the band creates a sound that moves between groove, warmth, rhythm, and energy.

Their performances balance musical depth with danceable power, bringing together five musicians into one fluid, dynamic live act. Based in Berlin, the project brings together world music fusion, stage energy, and a strong collective identity.

5 musicians • Berlin-based • World music fusion • Live experience`

  const copyBio = async () => {
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
      data-edit-id="about-section"
      data-edit-type="section"
      data-edit-label="Sección Sobre Nosotros"
      className={`relative min-h-screen w-full overflow-hidden bg-black ${className}`}
    >
      <div 
        ref={bgRef}
        data-edit-id="about-bg-image"
        data-edit-type="image"
        data-edit-label="Imagen de fondo"
        className="absolute inset-0 -z-10"
      >
        <img 
          src="/images/about-bg-main.jpg"
          alt="Band members background"
          className="h-full w-full object-cover"
          style={{ objectPosition: "center top" }}
        />
      </div>

      <div className="section-photo-scrim" />
      <div className="section-photo-fade-top" />
      <div className="section-photo-fade-bottom" />

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:px-8">
        <motion.div 
          style={{ opacity, y }} 
          className="mx-auto w-full max-w-4xl"
        >
          <div ref={headerRef}>
            <SectionHeader
              eyebrow="About the Band"
              title="A Journey Through Sound"
              titleClassName="text-white"
              className="mb-10 max-w-4xl md:mb-12"
              data-edit-id="about-header"
              data-edit-type="text"
              data-edit-label="Sección Sobre Nosotros"
            />
          </div>

          {/* Box de texto reducido ~20% */}
          <motion.div
            ref={textBoxRef}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="w-full rounded-3xl border border-white/10 bg-black/50 px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14 shadow-2xl backdrop-blur-md"
            data-edit-id="about-text-box"
            data-edit-type="box"
            data-edit-label="About Text Box"
          >
            <div className="space-y-6 text-white md:space-y-8">
              <p 
                ref={text1Ref}
                data-edit-id="about-text-1"
                data-edit-type="text"
                data-edit-label="Descripción 1"
                className="mb-0 max-w-none text-base leading-relaxed text-white/95 md:text-lg"
              >
                Tales for the Tillerman is a Berlin-based collective blending world music, 
                funk, soul, and reggae into a vibrant live experience. With roots spanning 
                across continents, the band creates a sound that moves between groove, 
                warmth, rhythm, and energy.
              </p>

              <p 
                ref={text2Ref}
                data-edit-id="about-text-2"
                data-edit-type="text"
                data-edit-label="Descripción 2"
                className="mb-0 max-w-none text-base leading-relaxed text-white/90 md:text-lg"
              >
                Their performances balance musical depth with danceable power, bringing 
                together five musicians into one fluid, dynamic live act. Based in Berlin, 
                the project brings together world music fusion, stage energy, and a strong 
                collective identity.
              </p>

              <p 
                ref={tagsRef}
                data-edit-id="about-tags"
                data-edit-type="text"
                data-edit-label="Etiquetas"
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
              whileTap={{ scale: 0.98 }}
              animate={copied ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              data-edit-id="about-copy-button"
              data-edit-type="button"
              data-edit-label="Copy Bio Button"
              className={`inline-flex items-center justify-center rounded-2xl border px-8 py-3.5 text-base font-semibold shadow-lg transition-all md:text-lg ${
                copied
                  ? "border-[#FF8C21] bg-[#FF8C21] text-white shadow-[#FF8C21]/50"
                  : "border-[#FF8C21]/70 bg-[#FF8C21]/90 text-white shadow-[#FF8C21]/30 hover:bg-[#FF8C21] hover:shadow-[#FF8C21]/40"
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