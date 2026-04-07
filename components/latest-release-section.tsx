"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { useVisualEditor } from "@/components/visual-editor"

export function LatestReleaseSection() {
  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()
  const [isIosMobile, setIsIosMobile] = useState(false)
  const [isAndroidMobile, setIsAndroidMobile] = useState(false)

  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const watchButtonRef = useRef<HTMLAnchorElement>(null)
  const showsButtonRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const userAgent = navigator.userAgent || ""
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches
    const ios = /iPhone|iPad|iPod/i.test(userAgent) || ((navigator.platform === "MacIntel" || navigator.platform === "MacPPC") && navigator.maxTouchPoints > 1)
    const android = /Android/i.test(userAgent)

    setIsIosMobile(ios && hasCoarsePointer)
    setIsAndroidMobile(android && hasCoarsePointer)
  }, [])

  useEffect(() => {
    if (!isEditing) return

    if (sectionRef.current) {
      const existing = getElementById('latest-release-section')
      registerEditable({
        id: 'latest-release-section',
        type: 'section',
        label: 'Release Section',
        parentId: null,
        element: sectionRef.current,
        originalRect: sectionRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
      })
    }

    if (bgRef.current) {
      const existing = getElementById('latest-release-bg')
      registerEditable({
        id: 'latest-release-bg',
        type: 'image',
        label: 'Release Background',
        parentId: null,
        element: bgRef.current,
        originalRect: bgRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: bgRef.current.offsetWidth, height: bgRef.current.offsetHeight },
      })
    }

    if (cardRef.current) {
      const existing = getElementById('latest-release-card')
      registerEditable({
        id: 'latest-release-card',
        type: 'box',
        label: 'Release Card',
        parentId: null,
        element: cardRef.current,
        originalRect: cardRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: cardRef.current.offsetWidth, height: cardRef.current.offsetHeight },
      })
    }

    if (titleRef.current) {
      const existing = getElementById('latest-release-title')
      registerEditable({
        id: 'latest-release-title',
        type: 'text',
        label: 'Release Title',
        parentId: null,
        element: titleRef.current,
        originalRect: titleRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: titleRef.current.offsetWidth, height: titleRef.current.offsetHeight },
      })
    }

    if (subtitleRef.current) {
      const existing = getElementById('latest-release-subtitle')
      registerEditable({
        id: 'latest-release-subtitle',
        type: 'text',
        label: 'Release Subtitle',
        parentId: null,
        element: subtitleRef.current,
        originalRect: subtitleRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: subtitleRef.current.offsetWidth, height: subtitleRef.current.offsetHeight },
      })
    }

    if (watchButtonRef.current) {
      const existing = getElementById('latest-release-watch-button')
      registerEditable({
        id: 'latest-release-watch-button',
        type: 'button',
        label: 'Watch Video Button',
        parentId: null,
        element: watchButtonRef.current,
        originalRect: watchButtonRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: watchButtonRef.current.offsetWidth, height: watchButtonRef.current.offsetHeight },
      })
    }

    if (showsButtonRef.current) {
      const existing = getElementById('latest-release-shows-button')
      registerEditable({
        id: 'latest-release-shows-button',
        type: 'button',
        label: 'See Shows Button',
        parentId: null,
        element: showsButtonRef.current,
        originalRect: showsButtonRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: showsButtonRef.current.offsetWidth, height: showsButtonRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('latest-release-section')
      unregisterEditable('latest-release-bg')
      unregisterEditable('latest-release-card')
      unregisterEditable('latest-release-title')
      unregisterEditable('latest-release-subtitle')
      unregisterEditable('latest-release-watch-button')
      unregisterEditable('latest-release-shows-button')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])
  return (
    <section
      ref={sectionRef}
      id="latest-release"
      data-editor-node-id="latest-release-section"
      data-editor-node-type="section"
      data-editor-node-label="Release Section"
      className="relative overflow-hidden bg-black"
    >
      <div 
        ref={bgRef}
        data-editor-node-id="latest-release-bg"
        data-editor-node-type="background"
        data-editor-media-kind="video"
        data-editor-node-label="Fondo Video YouTube"
        className="absolute inset-0 z-0"
      >
        {isIosMobile ? (
          <img
            src="https://i.ytimg.com/vi/xofflmVqYGs/maxresdefault.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <iframe
            src="https://www.youtube.com/embed/xofflmVqYGs?autoplay=1&mute=1&loop=1&playlist=xofflmVqYGs&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title=""
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 ${
              isAndroidMobile
                ? "h-[165%] w-[185%] -translate-y-1/2"
                : "h-[125%] w-[125%] -translate-y-[40%]"
            }`}
            allow="autoplay; encrypted-media"
            allowFullScreen={false}
          />
        )}
        <div className="section-photo-fade-top" />
        <div className="section-photo-fade-bottom" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-6xl">
          <motion.div
            ref={cardRef}
            data-editor-node-id="latest-release-card"
            data-editor-node-type="card"
            data-editor-node-label="Release Card"
            initial={isEditing ? false : { opacity: 0, y: 10 }}
            whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
            viewport={isEditing ? undefined : { once: true, amount: 0.25 }}
            transition={isEditing ? undefined : { duration: 0.45 }}
            className="flex w-full max-w-4xl flex-col items-center rounded-2xl border border-primary/28 bg-black/24 p-6 text-center shadow-md backdrop-blur-sm md:p-8"
          >
            <h2 
              ref={titleRef}
              data-editor-node-id="latest-release-title"
              data-editor-node-type="text"
              data-editor-node-label="Título del Lanzamiento"
              className="mb-[var(--spacing-sm)] w-full text-center font-serif text-[length:var(--text-h2)] leading-[var(--line-height-tight)] text-foreground"
            >
              {CAMPAIGN_CONTENT.releaseTitle}
            </h2>

            <p 
              ref={subtitleRef}
              data-editor-node-id="latest-release-subtitle"
              data-editor-node-type="text"
              data-editor-node-label="Subtítulo del Lanzamiento"
              className="mb-6 w-full text-center text-[length:var(--text-body)] text-muted-foreground"
            >
              {CAMPAIGN_CONTENT.releaseSubtitle}
            </p>

            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                ref={watchButtonRef}
                href="https://www.youtube.com/watch?v=xofflmVqYGs"
                target="_blank"
                rel="noopener noreferrer"
                data-editor-node-id="latest-release-watch-button"
                data-editor-node-type="button"
                data-editor-node-label="Watch Video Button"
                className={`rounded-xl px-6 py-3 text-center text-base font-semibold shadow-md min-h-[48px] ${CAMPAIGN_PRIMARY_CTA_CLASS}`}
              >
                {CAMPAIGN_CONTENT.releaseCtaLabel}
              </a>
              <a
                ref={showsButtonRef}
                href={CAMPAIGN_CONTENT.showsCtaHref}
                target="_blank"
                rel="noopener noreferrer"
                data-editor-node-id="latest-release-shows-button"
                data-editor-node-type="button"
                data-editor-node-label="See Shows Button"
                className="rounded-xl border border-primary/35 px-6 py-3 text-center text-base font-semibold text-primary transition-colors hover:bg-primary/10 min-h-[48px]"
              >
                {CAMPAIGN_CONTENT.showsCtaLabel}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
