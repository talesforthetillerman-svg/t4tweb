"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"
import { useVisualEditor } from "@/components/visual-editor"
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
import type { BandMemberData } from "@/lib/sanity/band-members-loader"

interface BandMembersSectionProps {
  initialMembers: BandMemberData[]
  backgroundImageUrl?: string
  headerEyebrow?: string
  headerTitle?: string
  headerDescription?: string
  elementStyles?: Record<string, Record<string, unknown>>
}

function getBandMemberCardStyle(
  elementStyles: Record<string, Record<string, unknown>>,
  nodeId: string
): CSSProperties {
  const style = { ...getElementLayoutStyle(elementStyles, nodeId) }
  const rawStyle = elementStyles[nodeId]
  delete style.opacity
  if (typeof rawStyle?.backgroundColor === "string") {
    style.backgroundColor = rawStyle.backgroundColor
    style.backgroundImage = "none"
  }
  return style
}

export function BandMembersSection({
  initialMembers,
  backgroundImageUrl = "/images/sections/band-section.jpg",
  headerEyebrow = "The Musicians",
  headerTitle = "Meet the Band",
  headerDescription = "Five musicians from diverse backgrounds, united by a passion for rhythm and groove.",
  elementStyles = {},
}: BandMembersSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { opacity, y } = useScrollAnimation(sectionRef)
  const { isEditing } = useVisualEditor()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const onEditorBandMemberFocus = (event: Event) => {
      const custom = event as CustomEvent<{ index?: number }>
      const index = custom.detail?.index
      if (typeof index !== "number" || Number.isNaN(index)) return
      if (index < 0 || index >= initialMembers.length) return
      setActiveIndex(index)
    }
    window.addEventListener("editor-band-member-focus", onEditorBandMemberFocus as EventListener)
    return () => {
      window.removeEventListener("editor-band-member-focus", onEditorBandMemberFocus as EventListener)
    }
  }, [initialMembers.length])

  const handleMemberClick = (index: number) => {
    setActiveIndex(index)
    if (isMobile) {
      setModalOpen(true)
    }
  }

  const displayedMembers = initialMembers.map((member, index) => ({
    ...member,
    number: String(member.id).padStart(2, "0"),
    fullName: member.fullName,
    role: member.role,
    image: member.image,
  }))
  const activeMember = displayedMembers[activeIndex]
  const activeImage = activeMember?.image || initialMembers[0]?.image || ""

  return (
    <section
      ref={sectionRef}
      data-editor-node-id="band-members-section"
      data-editor-node-type="section"
      data-editor-node-label="Sección Miembros de la Banda"
      className="relative isolate min-h-screen w-full overflow-hidden bg-black"
      style={getElementLayoutStyle(elementStyles, "band-members-section")}
    >
      {/* Fondo full width */}
      <div
        data-editor-node-id="band-members-bg"
        data-editor-node-type="background"
        data-editor-media-kind="image"
        data-editor-node-label="Imagen de fondo banda"
        className="absolute inset-0 z-0"
        style={getElementLayoutStyle(elementStyles, "band-members-bg")}
      >
        <Image
          src={backgroundImageUrl}
          alt="Band background"
          fill
          className="object-cover"
        />
      </div>

      {/* Gradiente superior */}
      <div className="section-photo-fade-top z-10" />

      {/* Gradiente inferior */}
      <div className="section-photo-fade-bottom z-10" />

      <div className="section-photo-scrim z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            style={isEditing ? undefined : { opacity, y }}
            className="mb-8 md:mb-12 lg:mb-16 text-center"
          >
          <SectionHeader
            eyebrow={headerEyebrow}
            title={headerTitle}
            description={headerDescription}
            dataEditId="band-members-header"
            dataEditLabel="Encabezado Miembros"
            elementStyles={elementStyles}
          />
        </motion.div>

        <div className="grid items-start gap-5 md:gap-8 lg:grid-cols-2 lg:gap-14">
          {/* Desktop photo - hidden on mobile */}
          <div className="relative hidden max-h-[78vh] max-h-[78dvh] min-h-[420px] overflow-hidden rounded-3xl bg-zinc-950 shadow-2xl lg:block lg:aspect-[3/4]">
            {displayedMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={false}
                animate={{
                  opacity: activeIndex === index ? 1 : 0,
                  scale: activeIndex === index ? 1 : 1.08,
                }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <div
                  className="absolute inset-0"
                  data-editor-node-id={`member-item-${index}-image`}
                  data-editor-node-type="image"
                  data-editor-node-label={`${member.fullName} photo`}
                  data-editor-media-kind="image"
                  style={getElementLayoutStyle(elementStyles, `member-item-${index}-image`)}
                >
                  <Image
                    src={member.image}
                    alt={member.fullName}
                    fill
                    data-member-photo-index={index}
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                  <h3 data-member-overlay-name-index={index} className="text-2xl md:text-3xl lg:text-4xl font-serif text-white mb-2 tracking-tight">
                    {member.fullName}
                  </h3>
                  <p data-member-overlay-role-index={index} className="text-xl text-orange-400 font-medium">
                    {member.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-2.5 md:space-y-4">
            {displayedMembers.map((member, index) => (
              <motion.div
                key={member.id}
                onClick={() => handleMemberClick(index)}
                onMouseEnter={() => (!isEditing && !isMobile) && setActiveIndex(index)}
                whileHover={isEditing ? undefined : { scale: 1.02, x: 8 }}
                transition={isEditing ? undefined : { type: "spring", stiffness: 400, damping: 25 }}
                data-editor-node-id={`member-item-${index}`}
                data-editor-node-type="card"
                data-editor-node-label={member.fullName}
                data-editor-grouped="true"
                role="button"
                tabIndex={0}
                aria-label={`${member.fullName} card`}
                style={getBandMemberCardStyle(elementStyles, `member-item-${index}`)}
                className={`group flex min-h-[62px] w-full touch-manipulation items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-300 md:min-h-[88px] md:rounded-2xl md:p-6
                  ${
                    activeIndex === index
                      ? "border-orange-500 bg-zinc-900/80"
                      : "border-white/10 hover:border-white/20 bg-black/40 hover:bg-zinc-950"
                  }`}
              >
                <div className="min-w-0 flex-1">
                  <h4
                    data-editor-node-id={`member-item-${index}-name`}
                    data-editor-node-type="text"
                    data-editor-node-label={`${member.fullName} name`}
                    data-member-name-index={index}
                    style={getElementLayoutStyle(elementStyles, `member-item-${index}-name`)}
                    className={`text-base md:text-xl font-medium transition-colors truncate ${
                      activeIndex === index ? "text-white" : "text-white/80 group-hover:text-white"
                    }`}
                  >
                    {member.fullName}
                  </h4>
                  <p
                    data-editor-node-id={`member-item-${index}-role`}
                    data-editor-node-type="text"
                    data-editor-node-label={`${member.fullName} role`}
                    data-member-role-index={index}
                    style={getElementLayoutStyle(elementStyles, `member-item-${index}-role`)}
                    className={`text-xs md:text-sm mt-0.5 md:mt-1 transition-colors ${
                      activeIndex === index ? "text-orange-400" : "text-white/50"
                    }`}
                  >
                    {member.role}
                  </p>
                </div>

                <div
                  data-editor-node-id={`member-item-${index}-number`}
                  data-editor-node-type="text"
                  data-editor-node-label={`${member.fullName} number`}
                  data-member-number-index={index}
                  style={getElementLayoutStyle(elementStyles, `member-item-${index}-number`)}
                  className={`w-7 h-7 md:w-8 md:h-8 shrink-0 ml-3 rounded-full flex items-center justify-center text-xs font-mono border transition-all ${
                    activeIndex === index
                      ? "border-orange-500 text-orange-400 bg-orange-950"
                      : "border-white/20 text-white/40 group-hover:border-white/40"
                  }`}
                >
                  {member.number}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile modal */}
      <AnimatePresence>
        {modalOpen && activeMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3.5 lg:hidden"
            onClick={() => setModalOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80" />
            
            <div
              className="relative w-full max-w-[22rem] overflow-hidden rounded-2xl shadow-2xl"
              style={{ maxHeight: "82dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                <Image
                  src={activeImage}
                  alt={activeMember.fullName}
                  fill
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ zIndex: 1 }}
                  draggable={false}
                  sizes="22rem"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" style={{ zIndex: 2 }} />
                <div className="absolute bottom-0 left-0 right-0 p-6" style={{ zIndex: 3 }}>
                  <h3 className="text-xl font-serif text-white mb-1 truncate">
                    {activeMember.fullName}
                  </h3>
                  <p className="text-base text-orange-400 font-medium">
                    {activeMember.role}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                style={{ zIndex: 4 }}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
