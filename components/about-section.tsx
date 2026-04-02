"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"

export function AboutSection({ className = "" }: { className?: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const { opacity, y } = useScrollAnimation(sectionRef)
  const [copied, setCopied] = useState(false)

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
          <SectionHeader
            eyebrow="About the Band"
            title="A Journey Through Sound"
            titleClassName="text-white"
            className="mb-10 max-w-4xl md:mb-12"
            data-edit-id="about-header"
            data-edit-type="text"
            data-edit-label="Sección Sobre Nosotros"
          />

          {/* Box de texto reducido ~20% */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="w-full rounded-3xl border border-white/10 bg-black/50 px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14 shadow-2xl backdrop-blur-md"
          >
            <div className="space-y-6 text-white md:space-y-8">
              <p 
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
              type="button"
              onClick={copyBio}
              whileTap={{ scale: 0.98 }}
              animate={copied ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
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