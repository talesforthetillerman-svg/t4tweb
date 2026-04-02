"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"

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
    hidden: { opacity: 0, y: 12 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.08,
        duration: 0.42,
      },
    }),
  }

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/sections/press-bg.jpg"
          alt="Press kit background"
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>
      <div className="section-photo-scrim" />
      <div className="section-photo-fade-top" />
      <div className="section-photo-fade-bottom" />

      <div className="relative z-20">
        <div className="relative z-10 mx-auto max-w-7xl">
          <motion.div style={{ opacity, y }} className="mb-10 md:mb-12">
            <SectionHeader
              eyebrow="Media Resources"
              title="Professional Press Materials"
              description="Everything you need for press coverage, event promotion, and booking information."
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="mb-10 md:mb-12"
          >
            <div className="rounded-2xl border border-border bg-card/35 p-7 text-center shadow-md backdrop-blur-sm md:p-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[#FF8C21]/18 md:mb-6 md:h-20 md:w-20">
                <FolderIcon className="h-9 w-9 text-[#FF8C21] md:h-10 md:w-10" />
              </div>
              <h3 className="mb-2 font-serif text-[length:var(--text-h3)] leading-tight text-foreground md:mb-3">
                Complete Press Kit
              </h3>
              <p className="mx-auto mb-6 max-w-lg text-[length:var(--text-body)] text-muted-foreground md:mb-8">
                Download our full press kit including high-quality photos, biography, technical rider, and more.
              </p>
              <a
                href="/PressKit T40 2025.26_compressed.pdf"
                download="PressKit T40 2025.26_compressed.pdf"
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF8C21] px-8 py-4 text-base font-semibold text-white shadow-md shadow-[#FF8C21]/22 transition-all hover:bg-[#FF7C00] md:text-lg"
              >
                <DownloadIcon className="h-6 w-6" />
                Press Kit
              </a>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {resources.map((resource, index) => {
              const Icon = resource.icon
              return (
                <motion.a
                  key={resource.title}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  variants={resourceVariants}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  href={resource.href}
                  target={resource.download ? undefined : "_blank"}
                  rel={resource.download ? undefined : "noopener noreferrer"}
                  download={resource.download ? true : undefined}
                  className="group rounded-2xl border border-border bg-card/35 p-6 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-[#FF8C21]/45 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
                    <Icon />
                  </div>
                  <h3 className="mb-1 font-medium text-foreground">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                </motion.a>
              )
            })}

            <motion.a
              href="mailto:talesforthetillerman@gmail.com"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.45, delay: 0.06, type: "spring", stiffness: 320, damping: 22 }}
              className="group overflow-hidden rounded-2xl border border-border bg-card/35 p-6 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-[#FF8C21]/45 hover:shadow-lg"
            >
              <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg">
                <img
                  src="/images/Momo Garcia Manager.png"
                  alt="Momo Garcia Manager"
                  className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
                />
              </div>
              <h3 className="mb-1 font-medium text-foreground">Manager</h3>
              <p className="text-sm text-muted-foreground">Momo Garcia - Band Management</p>
            </motion.a>
          </div>
        </div>
      </div>

      <div className="section-photo-fade-bottom" />
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