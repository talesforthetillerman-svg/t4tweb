"use client"

import { useEffect, useRef } from "react"
import { useVisualEditor } from "@/components/visual-editor"
import { useHomeEditorImageSrc } from "@/components/home-editor-overrides-provider"
import { useDesktopLayoutOverridesEnabled } from "@/hooks/use-desktop-layout-overrides"
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
import type { IntroBannerData } from "@/lib/sanity/intro-banner-loader"

export function IntroBannerSection({ data }: { data: IntroBannerData }) {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()
  const allowGeometryOverrides = useDesktopLayoutOverridesEnabled(isEditing)

  const sectionRef = useRef<HTMLDivElement>(null)
  const bannerGifRef = useRef<HTMLDivElement>(null)
  const bannerTextRef = useRef<HTMLParagraphElement>(null)
  const bookButtonRef = useRef<HTMLAnchorElement>(null)
  const pressButtonRef = useRef<HTMLAnchorElement>(null)

  const es = data.elementStyles
  const resolvedIntroGifSrc = useHomeEditorImageSrc("intro-banner-gif", data.gifUrl)

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
      style={getElementLayoutStyle(es, "intro-section", { includeGeometry: allowGeometryOverrides })}
      className="relative flex min-h-[52vh] min-h-[52dvh] flex-col items-center justify-center gap-3 px-3 pb-10 pt-8 sm:min-h-[58vh] sm:min-h-[58dvh] sm:px-4 sm:pb-14 sm:pt-12"
    >
      <div
        ref={bannerGifRef}
        data-editor-node-id="intro-banner-gif"
        data-editor-node-type="image"
        data-editor-node-label="Banner GIF"
        style={getElementLayoutStyle(es, "intro-banner-gif", { includeGeometry: allowGeometryOverrides })}
        className="absolute left-0 top-0 z-0 h-full w-full overflow-hidden opacity-30"
      >
        <img
          src={resolvedIntroGifSrc}
          alt="Animated banner"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center gap-3.5">
        <p
          ref={bannerTextRef}
          data-editor-node-id="intro-banner-text"
          data-editor-node-type="text"
          data-editor-node-label="Banner Text"
          style={getElementLayoutStyle(es, "intro-banner-text", { includeGeometry: allowGeometryOverrides })}
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
            style={getElementLayoutStyle(es, "intro-book-button", { includeGeometry: allowGeometryOverrides })}
            className="w-full rounded-xl bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-5 py-3.5 text-center text-[0.95rem] font-bold text-white shadow-xl shadow-[#FF8C21]/50 transition-all min-h-[50px] sm:w-auto sm:rounded-2xl sm:px-8 sm:py-5 sm:text-lg sm:min-h-[68px]"
          >
            {data.bookLabel}
          </a>

          <a
            ref={pressButtonRef}
            href={data.pressHref}
            data-editor-node-id="intro-press-button"
            data-editor-node-type="button"
            data-editor-node-label="Press Kit Button"
            style={getElementLayoutStyle(es, "intro-press-button", { includeGeometry: allowGeometryOverrides })}
            className="w-full rounded-xl border border-white/40 bg-white/5 px-5 py-3.5 text-center text-[0.95rem] font-semibold text-white backdrop-blur-sm transition-all min-h-[50px] hover:border-white/65 hover:bg-white/15 sm:w-auto sm:rounded-2xl sm:px-8 sm:py-5 sm:text-lg sm:min-h-[68px]"
          >
            {data.pressLabel}
          </a>
        </div>
      </div>
    </div>
  )
}
