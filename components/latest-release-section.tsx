"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { useVisualEditor } from "@/components/visual-editor"

export function LatestReleaseSection() {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()

  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const watchButtonRef = useRef<HTMLAnchorElement>(null)
  const showsButtonRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!isEditing) return

    if (sectionRef.current) {
      registerEditable({
        id: 'latest-release-section',
        type: 'section',
        label: 'Release Section',
        parentId: null,
        element: sectionRef.current,
        originalRect: sectionRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
      })
    }

    if (bgRef.current) {
      registerEditable({
        id: 'latest-release-bg',
        type: 'image',
        label: 'Release Background',
        parentId: 'latest-release-section',
        element: bgRef.current,
        originalRect: bgRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bgRef.current.offsetWidth, height: bgRef.current.offsetHeight },
      })
    }

    if (titleRef.current) {
      registerEditable({
        id: 'latest-release-title',
        type: 'text',
        label: 'Release Title',
        parentId: 'latest-release-section',
        element: titleRef.current,
        originalRect: titleRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: titleRef.current.offsetWidth, height: titleRef.current.offsetHeight },
      })
    }

    if (subtitleRef.current) {
      registerEditable({
        id: 'latest-release-subtitle',
        type: 'text',
        label: 'Release Subtitle',
        parentId: 'latest-release-section',
        element: subtitleRef.current,
        originalRect: subtitleRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: subtitleRef.current.offsetWidth, height: subtitleRef.current.offsetHeight },
      })
    }

    if (watchButtonRef.current) {
      registerEditable({
        id: 'latest-release-watch-button',
        type: 'button',
        label: 'Watch Video Button',
        parentId: 'latest-release-section',
        element: watchButtonRef.current,
        originalRect: watchButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: watchButtonRef.current.offsetWidth, height: watchButtonRef.current.offsetHeight },
      })
    }

    if (showsButtonRef.current) {
      registerEditable({
        id: 'latest-release-shows-button',
        type: 'button',
        label: 'See Shows Button',
        parentId: 'latest-release-section',
        element: showsButtonRef.current,
        originalRect: showsButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: showsButtonRef.current.offsetWidth, height: showsButtonRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('latest-release-section')
      unregisterEditable('latest-release-bg')
      unregisterEditable('latest-release-title')
      unregisterEditable('latest-release-subtitle')
      unregisterEditable('latest-release-watch-button')
      unregisterEditable('latest-release-shows-button')
    }
  }, [isEditing, registerEditable, unregisterEditable])
  return (
    <section
      ref={sectionRef}
      id="latest-release"
      data-edit-id="latest-release-section"
      data-edit-type="section"
      data-edit-label="Sección Último Lanzamiento"
      className="relative overflow-hidden bg-black"
    >
      <div 
        ref={bgRef}
        data-edit-id="latest-release-bg"
        data-edit-type="image"
        data-edit-label="Fondo Video YouTube"
        className="absolute inset-0 z-0"
      >
        <img
          src="/images/sections/hero-bg.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-40 md:hidden"
        />
        <iframe
          src="https://www.youtube.com/embed/xofflmVqYGs?autoplay=1&mute=1&loop=1&playlist=xofflmVqYGs&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
          title=""
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[125%] w-[125%] -translate-x-1/2 -translate-y-[40%]"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
        />
        <div className="section-photo-fade-top" />
        <div className="section-photo-fade-bottom" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45 }}
            className="flex w-full max-w-4xl flex-col items-center rounded-2xl border border-primary/28 bg-black/24 p-6 text-center shadow-md backdrop-blur-sm md:p-8"
          >
            <h2 
              ref={titleRef}
              data-edit-id="latest-release-title"
              data-edit-type="text"
              data-edit-label="Título del Lanzamiento"
              className="mb-[var(--spacing-sm)] w-full text-center font-serif text-[length:var(--text-h2)] leading-[var(--line-height-tight)] text-foreground"
            >
              {CAMPAIGN_CONTENT.releaseTitle}
            </h2>

            <p 
              ref={subtitleRef}
              data-edit-id="latest-release-subtitle"
              data-edit-type="text"
              data-edit-label="Subtítulo del Lanzamiento"
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
                data-edit-id="latest-release-watch-button"
                data-edit-type="button"
                data-edit-label="Watch Video Button"
                className={`rounded-xl px-6 py-3 text-center text-base font-semibold shadow-md min-h-[48px] ${CAMPAIGN_PRIMARY_CTA_CLASS}`}
              >
                {CAMPAIGN_CONTENT.releaseCtaLabel}
              </a>
              <a
                ref={showsButtonRef}
                href={CAMPAIGN_CONTENT.showsCtaHref}
                target="_blank"
                rel="noopener noreferrer"
                data-edit-id="latest-release-shows-button"
                data-edit-type="button"
                data-edit-label="See Shows Button"
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