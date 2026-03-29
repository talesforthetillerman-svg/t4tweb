"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"

export function PressKitSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { opacity, y } = useScrollAnimation(sectionRef)

  const resources = [
    {
      title: "Band Logo",
      description: "High-resolution logo files",
      icon: ImageIcon,
      href: "/images/logo-transparent.png",
      download: true,
    },
    {
      title: "Linktree",
      description: "All links in one place",
      icon: LinkIcon,
      href: "https://linktr.ee/tales4tillerman",
    },
  ]

  const resourceVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.5,
      },
    }),
  }

  return (
    <section id="press-kit" ref={sectionRef} className="relative w-full overflow-hidden">
      <div className="absolute inset-0 top-0 w-screen h-full -z-10 bg-cover bg-center bg-no-repeat" style={{ 
        backgroundImage: "url('/images/sections/press-bg.jpg')",
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)"
      }}>
        <Image
          src="/images/sections/press-bg.jpg"
          alt="Press kit background"
          fill
          className="object-cover w-full h-full"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="absolute inset-0 w-full h-full bg-black/50 -z-10" />

      {/* Top fade in */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent w-full pointer-events-none z-10" />

      <div className="relative py-16 md:py-20 overflow-hidden z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <motion.div
            style={{ opacity, y }}
            className="text-center mb-12"
          >
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-[#FF8C21] text-sm font-medium tracking-wider uppercase mb-4 block"
            >
              Media Resources
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance"
            >
              Professional Press Materials
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted-foreground max-w-2xl mx-auto text-lg"
            >
              Everything you need for press coverage, event promotion, and booking information.
            </motion.p>
          </motion.div>

          {/* Main Download CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <div className="bg-card/33 border border-border rounded-3xl p-8 md:p-12 text-center backdrop-blur-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#FF8C21]/20 flex items-center justify-center">
                <FolderIcon className="w-10 h-10 text-[#FF8C21]" />
              </div>
              <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
                Complete Press Kit
              </h3>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Download our full press kit including high-quality photos, biography, technical rider, and more.
              </p>
              <a
                href="/PressKit T40 2025.26_compressed.pdf"
                download="PressKit T40 2025.26_compressed.pdf"
                className="inline-flex items-center gap-3 px-10 py-5 bg-[#FF8C21] text-white rounded-xl font-semibold text-lg hover:bg-[#FF7C00] transition-all shadow-lg shadow-[#FF8C21]/25"
              >
                <motion.span
                  whileHover={{ scale: 1.1, rotate: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <DownloadIcon className="w-6 h-6" />
                </motion.span>
                Press Kit
              </a>
            </div>
          </motion.div>

          {/* Additional Resources Grid */}
          <div className="grid sm:grid-cols-3 gap-6">
            {/* Band Logo Card - First */}
            {resources.length > 0 && (() => {
              const BandLogoIcon = resources[0].icon;
              return (
                <motion.a
                  key={resources[0].title}
                  custom={0}
                  initial="hidden"
                  whileInView="visible"
                  variants={resourceVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  href={resources[0].href}
                  target={resources[0].download ? undefined : "_blank"}
                  rel={resources[0].download ? undefined : "noopener noreferrer"}
                  download={resources[0].download}
                  className="group p-6 bg-card/33 rounded-2xl border border-border hover:border-[#FF8C21]/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-secondary text-muted-foreground group-hover:text-foreground transition-colors">
                    <BandLogoIcon />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">{resources[0].title}</h3>
                  <p className="text-sm text-muted-foreground">{resources[0].description}</p>
                </motion.a>
              );
            })()}

            {/* Manager Card - Second */}
            <motion.a
              href="mailto:talesforthetillerman@gmail.com"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="group p-6 bg-card/33 rounded-2xl border border-border hover:border-[#FF8C21]/50 transition-all duration-300 overflow-hidden backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer"
            >
              <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
                <img
                  src="/images/Momo Garcia Manager.png"
                  alt="Momo Garcia Manager"
                  className="w-full h-full object-cover blur-sm group-hover:blur-none transition-all duration-300"
                />
              </div>
              <h3 className="font-medium text-foreground mb-1">Manager</h3>
              <p className="text-sm text-muted-foreground">Momo Garcia - Band Management</p>
            </motion.a>

            {/* Linktree Card - Third */}
            {resources.length > 1 && (() => {
              const LinktreeIcon = resources[1].icon;
              return (
                <motion.a
                  key={resources[1].title}
                  custom={1}
                  initial="hidden"
                  whileInView="visible"
                  variants={resourceVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  href={resources[1].href}
                  target={resources[1].download ? undefined : "_blank"}
                  rel={resources[1].download ? undefined : "noopener noreferrer"}
                  download={resources[1].download}
                  className="group p-6 bg-card/33 rounded-2xl border border-border hover:border-[#FF8C21]/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-secondary text-muted-foreground group-hover:text-foreground transition-colors">
                    <LinktreeIcon />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">{resources[1].title}</h3>
                  <p className="text-sm text-muted-foreground">{resources[1].description}</p>
                </motion.a>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Bottom fade out */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-black/20 to-black w-full pointer-events-none z-10" />
    </section>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}
