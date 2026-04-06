"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"

import { client } from "@/lib/sanity/client"
import { bandMembersQuery } from "@/lib/sanity/queries"

const FALLBACK_MEMBERS = [
  { id: 1, fullName: "Janosch Puhe", role: "Main Vocals", image: "/images/members/Janosch Puhe2.JPG" },
  { id: 2, fullName: "J.Ma Garcia Lopez", role: "Keys and Synth", image: "/images/members/J.Ma Garcia Lopez2.JPG" },
  { id: 3, fullName: "Otto Lorenz Contreras", role: "Drums", image: "/images/members/Otto Lorenz Contreras.JPG" },
  { id: 4, fullName: "Robii Crowford", role: "Electric Guitar", image: "/images/members/Robii Crowford.JPG" },
  { id: 5, fullName: "Tarik Benatmane", role: "Electric Bass", image: "/images/members/Tarik Benatmane.JPG" },
]

export function BandMembersSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [members, setMembers] = useState(FALLBACK_MEMBERS)
  const { opacity, y } = useScrollAnimation(sectionRef)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    client.fetch(bandMembersQuery).then((data) => {
      if (data && data.length > 0) {
        setMembers(data.map((m: any, i: number) => ({
          id: i + 1,
          fullName: m.fullName,
          role: m.role,
          image: m.imageUrl || FALLBACK_MEMBERS[i]?.image || FALLBACK_MEMBERS[0]?.image || "",
        })))
      }
    }).catch(() => {})
  }, [])

  const handleMemberClick = (index: number) => {
    setActiveIndex(index)
    if (isMobile) {
      setModalOpen(true)
    }
  }

  const activeMember = members[activeIndex]
  const activeImage = activeMember?.image || FALLBACK_MEMBERS[0]?.image || ""

  return (
    <section
      ref={sectionRef}
      data-editor-node-id="band-members-section"
      data-editor-node-type="section"
      data-editor-node-label="Sección Miembros de la Banda"
      className="relative min-h-screen w-full overflow-hidden bg-black"
    >
      {/* Fondo full width */}
      <div 
        data-editor-node-id="band-members-bg"
        data-editor-node-type="background"
        data-editor-node-label="Imagen de fondo banda"
        className="absolute inset-0 -z-10"
      >
        <Image
          src="/images/t4t-2.jpg"
          alt="Band background"
          fill
          className="object-cover"
        />
      </div>

      {/* Gradiente superior */}
      <div className="section-photo-fade-top" />

      {/* Gradiente inferior */}
      <div className="section-photo-fade-bottom" />

      <div className="section-photo-scrim" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          style={{ opacity, y }}
          className="mb-8 md:mb-12 lg:mb-16 text-center"
        >
          <SectionHeader
            eyebrow="The Musicians"
            title="Meet the Band"
            description="Five musicians from diverse backgrounds, united by a passion for rhythm and groove."
            dataEditId="band-members-header"
            dataEditLabel="Encabezado Miembros"
          />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 items-start">
          {/* Desktop photo - hidden on mobile */}
          <div className="hidden lg:block relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-950 shadow-2xl">
            {members.map((member, index) => (
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
                  data-editor-node-id={`member-photo-${index}`}
                  data-editor-node-type="image"
                  data-editor-node-label={`Foto ${member.fullName}`}
                  className="absolute inset-0"
                >
                  <Image
                    src={member.image}
                    alt={member.fullName}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                  <h3 
                    data-editor-node-id={`member-name-${index}`}
                    data-editor-node-type="text"
                    data-editor-node-label={`Nombre ${member.fullName}`}
                    className="text-2xl md:text-3xl lg:text-4xl font-serif text-white mb-2 tracking-tight"
                  >
                    {member.fullName}
                  </h3>
                  <p 
                    data-editor-node-id={`member-role-${index}`}
                    data-editor-node-type="text"
                    data-editor-node-label={`Rol ${member.fullName}`}
                    className="text-xl text-orange-400 font-medium"
                  >
                    {member.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-3 md:space-y-4">
            {members.map((member, index) => (
              <motion.button
                type="button"
                key={member.id}
                onClick={() => handleMemberClick(index)}
                onMouseEnter={() => !isMobile && setActiveIndex(index)}
                whileHover={{ scale: 1.02, x: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                data-editor-node-id={`member-item-${index}`}
                data-editor-node-type="card"
                data-editor-node-label={member.fullName}
                data-editor-grouped="true"
                className={`group w-full text-left p-4 md:p-6 rounded-xl md:rounded-2xl border transition-all duration-300 flex justify-between items-center min-h-[64px] md:min-h-[88px] touch-manipulation
                  ${
                    activeIndex === index
                      ? "border-orange-500 bg-zinc-900/80"
                      : "border-white/10 hover:border-white/20 bg-black/40 hover:bg-zinc-950"
                  }`}
              >
                <div className="min-w-0 flex-1">
                  <h4
                    data-editor-node-id={`member-list-name-${index}`}
                    data-editor-node-type="text"
                    data-editor-node-label={`Nombre en lista ${member.fullName}`}
                    className={`text-base md:text-xl font-medium transition-colors truncate ${
                      activeIndex === index ? "text-white" : "text-white/80 group-hover:text-white"
                    }`}
                  >
                    {member.fullName}
                  </h4>
                  <p
                    data-editor-node-id={`member-list-role-${index}`}
                    data-editor-node-type="text"
                    data-editor-node-label={`Rol en lista ${member.fullName}`}
                    className={`text-xs md:text-sm mt-0.5 md:mt-1 transition-colors ${
                      activeIndex === index ? "text-orange-400" : "text-white/50"
                    }`}
                  >
                    {member.role}
                  </p>
                </div>

                <div
                  className={`w-7 h-7 md:w-8 md:h-8 shrink-0 ml-3 rounded-full flex items-center justify-center text-xs font-mono border transition-all ${
                    activeIndex === index
                      ? "border-orange-500 text-orange-400 bg-orange-950"
                      : "border-white/20 text-white/40 group-hover:border-white/40"
                  }`}
                >
                  {String(member.id).padStart(2, "0")}
                </div>
              </motion.button>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden"
            onClick={() => setModalOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80" />
            
            <div
              className="relative w-[90vw] max-w-sm rounded-2xl overflow-hidden shadow-2xl"
              style={{ maxHeight: '80vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                <img
                  src={activeImage}
                  alt={activeMember.fullName}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ zIndex: 1 }}
                  draggable={false}
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
