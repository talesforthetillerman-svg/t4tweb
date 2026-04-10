"use client"

import { useRef, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"
import { useVisualEditor } from "@/components/visual-editor"

export function PressKitSection() {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const mainCardRef = useRef<HTMLDivElement>(null)
  const folderIconRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const downloadButtonRef = useRef<HTMLAnchorElement>(null)
  const resourceRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const managerRef = useRef<HTMLButtonElement>(null)

  const { opacity, y } = useScrollAnimation(sectionRef)

  const resources = useMemo(() => [
    {
      title: "Band Logo",
      description: "High-resolution logo files",
      icon: ImageIcon,
      href: "/images/logo-transparent.png",
      download: true,
    },
    {
      title: "Press Photos",
      description: "Official high-res band photography",
      icon: ImageIcon,
      href: "/images/about-bg-main.jpg",
      download: true,
    },
    {
      title: "Stage Plot",
      description: "Live setup technical rider",
      icon: FolderIcon,
      href: "/PressKit T40 2025.26_compressed.pdf",
      download: true,
    },
    {
      title: "Linktree",
      description: "All links in one place",
      icon: LinkIcon,
      href: "https://linktr.ee/tales4tillerman",
    },
  ], [])
  const visibleResources = resources.slice(0, 2)

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

  useEffect(() => {
    if (!isEditing) return

    if (sectionRef.current) {
      registerEditable({
        id: 'press-kit-section',
        type: 'section',
        label: 'Press Kit Section',
        parentId: null,
        element: sectionRef.current,
        originalRect: sectionRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
      })
    }

    if (bgRef.current) {
      registerEditable({
        id: 'press-kit-bg',
        type: 'image',
        label: 'Press Kit Background',
        parentId: 'press-kit-section',
        element: bgRef.current,
        originalRect: bgRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bgRef.current.offsetWidth, height: bgRef.current.offsetHeight },
      })
    }

    if (headerRef.current) {
      registerEditable({
        id: 'press-kit-header',
        type: 'text',
        label: 'Press Kit Header',
        parentId: 'press-kit-section',
        element: headerRef.current,
        originalRect: headerRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: headerRef.current.offsetWidth, height: headerRef.current.offsetHeight },
      })
    }

    if (folderIconRef.current) {
      registerEditable({
        id: 'press-kit-folder-icon',
        type: 'box',
        label: 'Folder Icon',
        parentId: 'press-kit-section',
        element: folderIconRef.current,
        originalRect: folderIconRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: folderIconRef.current.offsetWidth, height: folderIconRef.current.offsetHeight },
      })
    }

    if (mainCardRef.current) {
      registerEditable({
        id: 'press-kit-main-card',
        type: 'box',
        label: 'Main Press Kit Card',
        parentId: 'press-kit-section',
        element: mainCardRef.current,
        originalRect: mainCardRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: mainCardRef.current.offsetWidth, height: mainCardRef.current.offsetHeight },
      })
    }

    if (titleRef.current) {
      registerEditable({
        id: 'press-kit-title',
        type: 'text',
        label: 'Press Kit Title',
        parentId: 'press-kit-section',
        element: titleRef.current,
        originalRect: titleRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: titleRef.current.offsetWidth, height: titleRef.current.offsetHeight },
      })
    }

    if (descriptionRef.current) {
      registerEditable({
        id: 'press-kit-description',
        type: 'text',
        label: 'Press Kit Description',
        parentId: 'press-kit-section',
        element: descriptionRef.current,
        originalRect: descriptionRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: descriptionRef.current.offsetWidth, height: descriptionRef.current.offsetHeight },
      })
    }

    if (downloadButtonRef.current) {
      registerEditable({
        id: 'press-kit-download-button',
        type: 'button',
        label: 'Download Press Kit Button',
        parentId: 'press-kit-section',
        element: downloadButtonRef.current,
        originalRect: downloadButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: downloadButtonRef.current.offsetWidth, height: downloadButtonRef.current.offsetHeight },
      })
    }

    // Register lower cards for selection (drag is handled separately)
    resourceRefs.current = resourceRefs.current.slice(0, visibleResources.length)
    resourceRefs.current.forEach((ref, index) => {
      if (ref) {
        registerEditable({
          id: `press-kit-resource-${index}`,
          type: 'link',
          label: `Resource: ${visibleResources[index]?.title || index}`,
          parentId: 'press-kit-section',
          element: ref,
          originalRect: ref.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: ref.offsetWidth, height: ref.offsetHeight },
        })
      }
    })

    if (managerRef.current) {
      registerEditable({
        id: 'press-kit-manager',
        type: 'link',
        label: 'Manager Contact',
        parentId: 'press-kit-section',
        element: managerRef.current,
        originalRect: managerRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: managerRef.current.offsetWidth, height: managerRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('press-kit-section')
      unregisterEditable('press-kit-bg')
      unregisterEditable('press-kit-folder-icon')
      unregisterEditable('press-kit-main-card')
      unregisterEditable('press-kit-title')
      unregisterEditable('press-kit-description')
      unregisterEditable('press-kit-download-button')
      visibleResources.forEach((_, i) => unregisterEditable(`press-kit-resource-${i}`))
      unregisterEditable('press-kit-manager')
    }
  }, [isEditing, registerEditable, unregisterEditable, visibleResources])

  return (
    <section 
      ref={sectionRef} 
      className="relative min-h-[85vh] min-h-[85dvh] w-full overflow-hidden sm:min-h-screen sm:min-h-[100dvh]"
      data-editor-node-id="press-kit-section"
      data-editor-node-type="section"
      data-editor-node-label="Press Kit Section"
    >
      <div ref={bgRef} className="absolute inset-0 -z-10">
        <Image
          src="/images/sections/press-bg.jpg"
          alt="Press kit background"
          fill
          className="object-cover"
          sizes="100vw"
          data-editor-node-id="press-kit-bg"
          data-editor-node-type="background"
          data-editor-media-kind="image"
          data-editor-node-label="Background Image"
        />
      </div>
      <div className="section-photo-scrim" />
      <div className="section-photo-fade-top" />
      <div className="section-photo-fade-bottom" />

      <div className="relative z-20">
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <motion.div 
            ref={headerRef}
            style={isEditing ? undefined : { opacity, y }} 
            className="mb-10 md:mb-12"
          >
            <SectionHeader
              eyebrow="Media Resources"
              title="Professional Press Materials"
              description="Everything you need for press coverage, event promotion, and booking information."
              dataEditId="press-kit-header"
              dataEditType="text"
              dataEditLabel="Press Kit Header"
            />
          </motion.div>

          <motion.div
            ref={mainCardRef}
            initial={isEditing ? false : { opacity: 0, y: 12 }}
            whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
            viewport={isEditing ? undefined : { once: true, amount: 0.2 }}
            transition={isEditing ? undefined : { duration: 0.45 }}
            className="mb-10 md:mb-12"
          >
            <div 
              className="rounded-xl border border-border bg-card/35 p-4 text-center shadow-md backdrop-blur-sm sm:rounded-2xl sm:p-6 md:p-9"
              data-editor-node-id="press-kit-main-card"
              data-editor-node-type="card"
              data-editor-node-label="Main Press Kit Card"
            >
              <div ref={folderIconRef} className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#FF8C21]/18 sm:mb-5 sm:h-16 sm:w-16 md:mb-6 md:h-20 md:w-20">
                <FolderIcon className="h-8 w-8 text-[#FF8C21] sm:h-9 sm:w-9 md:h-10 md:w-10" />
              </div>
              <h3 
                ref={titleRef}
                className="mb-2 font-serif text-[clamp(1.5rem,6.5vw,2.1rem)] leading-tight text-foreground md:mb-3 md:text-[length:var(--text-h3)]"
                data-editor-node-id="press-kit-title"
                data-editor-node-type="text"
                data-editor-node-label="Press Kit Title"
              >
                Complete Press Kit
              </h3>
              <p 
                ref={descriptionRef}
                className="mx-auto mb-5 max-w-lg text-sm leading-relaxed text-muted-foreground md:mb-7 md:text-[length:var(--text-body)]"
                data-editor-node-id="press-kit-description"
                data-editor-node-type="text"
                data-editor-node-label="Press Kit Description"
              >
                Download our full press kit including high quality photos, biography, technical rider, and more.
              </p>
              <a
                ref={downloadButtonRef}
                href="/PressKit T40 2025.26_compressed.pdf"
                download="PressKit T40 2025.26_compressed.pdf"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF8C21] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#FF8C21]/22 transition-all hover:bg-[#FF7C00] sm:w-auto sm:px-7 sm:py-3.5 sm:text-base"
                data-editor-node-id="press-kit-download-button"
                data-editor-node-type="button"
                data-editor-node-label="Download Press Kit Button"
              >
                <DownloadIcon className="h-6 w-6" />
                Press Kit
              </a>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {visibleResources.map((resource, index) => {
              const Icon = resource.icon
              return (
                <motion.a
                  ref={(el) => { resourceRefs.current[index] = el }}
                  key={resource.title}
                  custom={index}
                  initial={isEditing ? false : "hidden"}
                  whileInView={isEditing ? undefined : "visible"}
                  variants={resourceVariants}
                  whileHover={isEditing ? undefined : { y: -2 }}
                  transition={isEditing ? undefined : { type: "spring", stiffness: 320, damping: 22 }}
                  href={resource.href}
                  target={resource.download ? undefined : "_blank"}
                  rel={resource.download ? undefined : "noopener noreferrer"}
                  download={resource.download ? true : undefined}
                  className="group rounded-xl border border-border bg-card/35 p-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-[#FF8C21]/45 hover:shadow-lg sm:rounded-2xl sm:p-5"
                  data-editor-node-id={`press-kit-resource-${index}`}
                  data-editor-node-type="card"
                  data-editor-node-label={`Resource: ${resource.title}`}
                  data-editor-grouped="true"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
                    <Icon />
                  </div>
                  <h3 className="mb-1 font-medium text-foreground">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                </motion.a>
              )
            })}

            <ManagerCard managerRef={managerRef} isEditing={isEditing} />
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

function ManagerCard({ managerRef, isEditing }: { managerRef: React.RefObject<HTMLButtonElement | null>; isEditing: boolean }) {
  const [showModal, setShowModal] = useState(false)
  
  return (
    <>
      <motion.button
        ref={managerRef}
        initial={isEditing ? false : { opacity: 0, y: 12 }}
        whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
        whileHover={isEditing ? undefined : { y: -2 }}
        transition={isEditing ? undefined : { duration: 0.45, delay: 0.06, type: "spring", stiffness: 320, damping: 22 }}
        onClick={() => {
          if (isEditing) return
          setShowModal(true)
        }}
        className="group flex w-full flex-col items-start rounded-2xl border border-border bg-card/35 p-6 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-[#FF8C21]/45 hover:shadow-lg cursor-pointer text-left"
        data-editor-node-id="press-kit-manager"
        data-editor-node-type="card"
        data-editor-node-label="Manager Contact"
        data-editor-grouped="true"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="mb-1 font-medium text-foreground">Manager</h3>
        <p className="text-sm text-muted-foreground">Momo Garcia</p>
      </motion.button>

      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
          className="relative max-h-[90vh] max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl">
              <img
                src="/images/Momo Garcia Manager.png"
                alt="Momo Garcia Manager"
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="mb-2 font-serif text-xl font-semibold text-foreground">Momo Garcia</h3>
            <p className="mb-4 text-sm text-muted-foreground">Band Management</p>
            <a
              href="mailto:talesforthetillerman@gmail.com"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF8C21] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#FF7C00]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Manager
            </a>
          </div>
        </div>
      )}
    </>
  )
}
