"use client"

import { useEffect, useRef } from "react"
import { useVisualEditor } from "@/components/visual-editor"
import type { IntroBannerData } from "@/lib/sanity/intro-banner-loader"

export function IntroBannerSection({ data }: { data: IntroBannerData }) {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()

  const sectionRef = useRef<HTMLDivElement>(null)
  const bannerGifRef = useRef<HTMLDivElement>(null)
  const bannerTextRef = useRef<HTMLParagraphElement>(null)
  const bookButtonRef = useRef<HTMLAnchorElement>(null)
  const pressButtonRef = useRef<HTMLAnchorElement>(null)

  // Component renders from Sanity data directly - no override hooks
  const resolvedIntroGifSrc = data.gifUrl

  useEffect(() => {
    if (!isEditing) return

    if (sectionRef.current) {
      registerEditable({
        id: "intro-section",
        type: "section",
        label: "Intro Section",
        parentId: null,
        element: sectionRef.current,
        originalRect: sectionRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
      })
    }

    if (bannerGifRef.current) {
      registerEditable({
        id: "intro-banner-gif",
        type: "image",
        label: "Banner GIF",
        parentId: "intro-section",
        element: bannerGifRef.current,
        originalRect: bannerGifRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerGifRef.current.offsetWidth, height: bannerGifRef.current.offsetHeight },
      })
    }

    if (bannerTextRef.current) {
      registerEditable({
        id: "intro-banner-text",
        type: "text",
        label: "Banner Text",
        parentId: "intro-section",
        element: bannerTextRef.current,
        originalRect: bannerTextRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerTextRef.current.offsetWidth, height: bannerTextRef.current.offsetHeight },
      })
    }

    if (bookButtonRef.current) {
      registerEditable({
        id: "intro-book-button",
        type: "button",
        label: "Book Band Button",
        parentId: "intro-section",
        element: bookButtonRef.current,
        originalRect: bookButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bookButtonRef.current.offsetWidth, height: bookButtonRef.current.offsetHeight },
      })
    }

    if (pressButtonRef.current) {
      registerEditable({
        id: "intro-press-button",
        type: "button",
        label: "Press Kit Button",
        parentId: "intro-section",
        element: pressButtonRef.current,
        originalRect: pressButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: pressButtonRef.current.offsetWidth, height: pressButtonRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable("intro-section")
      unregisterEditable("intro-banner-gif")
      unregisterEditable("intro-banner-text")
      unregisterEditable("intro-book-button")
      unregisterEditable("intro-press-button")
    }
  }, [isEditing, registerEditable, unregisterEditable])

  return (
    <div
      ref={sectionRef}
      data-editor-node-id="intro-section"
      data-editor-node-type="section"
      data-editor-node-label="Intro Section"
      className="relative -mt-20 z-20 flex min-h-[52vh] min-h-[52dvh] flex-col items-center justify-center gap-4 px-3 pb-12 pt-8 sm:min-h-[58vh] sm:min-h-[58dvh] sm:px-4 sm:pb-16 sm:pt-28 md:-mt-24 lg:-mt-28"
    >
      <div
        ref={bannerGifRef}
        data-editor-node-id="intro-banner-gif"
        data-editor-node-type="image"
        data-editor-node-label="Banner GIF"
        className="absolute left-0 top-0 z-0 h-full w-full overflow-hidden opacity-30"
      >
        <img
          src={resolvedIntroGifSrc}
          alt="Animated banner"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="relative z-20 flex w-full max-w-4xl flex-col items-center justify-center gap-3.5">
        <p
          ref={bannerTextRef}
          data-editor-node-id="intro-banner-text"
          data-editor-node-type="text"
          data-editor-node-label="Banner Text"
          className="max-w-2xl px-3 text-center text-[0.95rem] leading-relaxed text-white/90 sm:px-4 sm:text-lg md:text-xl"
        >
          {data.bannerText}
        </p>
        <div className="flex w-full flex-col items-center justify-center gap-3 px-3 sm:w-auto sm:flex-row sm:gap-6 sm:px-0">
          <a
            ref={bookButtonRef}
            href={data.bookHref}
            data-editor-node-id="intro-book-button"
            data-editor-node-type="button"
            data-editor-node-label="Book Band Button"
            className="btn-primary w-full sm:w-auto"
          >
            {data.bookLabel}
          </a>

          <a
            ref={pressButtonRef}
            href={data.pressHref}
            data-editor-node-id="intro-press-button"
            data-editor-node-type="button"
            data-editor-node-label="Press Kit Button"
            className="btn-secondary w-full sm:w-auto"
          >
            {data.pressLabel}
          </a>
        </div>
      </div>
    </div>
  )
}
