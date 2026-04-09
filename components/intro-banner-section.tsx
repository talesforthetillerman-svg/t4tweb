"use client"

import { useEffect, useRef } from "react"
import { useVisualEditor } from "@/components/visual-editor"
import { useHomeEditorImageSrc } from "@/components/home-editor-overrides-provider"
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
import type { IntroBannerData } from "@/lib/sanity/intro-banner-loader"

export function IntroBannerSection({ data }: { data: IntroBannerData }) {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()

  const sectionRef = useRef<HTMLDivElement>(null)
  const bannerGifRef = useRef<HTMLDivElement>(null)
  const bannerTextRef = useRef<HTMLParagraphElement>(null)
  const bookButtonRef = useRef<HTMLAnchorElement>(null)
  const pressButtonRef = useRef<HTMLAnchorElement>(null)

  const es = data.elementStyles
  const resolvedIntroGifSrc = useHomeEditorImageSrc("intro-banner-gif", data.gifUrl)

  useEffect(() => {
    console.info("[INTRO-TRACE][intro-component][render-input]", {
      gifUrlFromDoc: data.gifUrl,
      resolvedIntroGifSrc,
      introSectionStyle: es?.["intro-section"] || null,
      introGifStyle: es?.["intro-banner-gif"] || null,
      introTextStyle: es?.["intro-banner-text"] || null,
      introBookStyle: es?.["intro-book-button"] || null,
      introPressStyle: es?.["intro-press-button"] || null,
    })
  }, [data.gifUrl, es, resolvedIntroGifSrc])

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
      style={getElementLayoutStyle(es, "intro-section")}
      className="relative flex flex-col items-center justify-center gap-4 px-2 pt-8 pb-12 sm:px-4 sm:pt-12 sm:pb-16"
    >
      <div
        ref={bannerGifRef}
        data-editor-node-id="intro-banner-gif"
        data-editor-node-type="image"
        data-editor-node-label="Banner GIF"
        style={getElementLayoutStyle(es, "intro-banner-gif")}
        className="absolute left-0 top-0 z-0 h-full w-full overflow-hidden opacity-30"
      >
        <img
          src={resolvedIntroGifSrc}
          alt="Animated banner"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center gap-4">
        <p
          ref={bannerTextRef}
          data-editor-node-id="intro-banner-text"
          data-editor-node-type="text"
          data-editor-node-label="Banner Text"
          style={getElementLayoutStyle(es, "intro-banner-text")}
          className="max-w-2xl text-center text-base leading-relaxed text-white/90 sm:text-lg md:text-xl px-4"
        >
          {data.bannerText}
        </p>
        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
          <a
            ref={bookButtonRef}
            href={data.bookHref}
            data-editor-node-id="intro-book-button"
            data-editor-node-type="button"
            data-editor-node-label="Book Band Button"
            style={getElementLayoutStyle(es, "intro-book-button")}
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-10 py-7 text-lg font-bold text-white shadow-xl shadow-[#FF8C21]/50 transition-all min-h-[80px]"
          >
            {data.bookLabel}
          </a>

          <a
            ref={pressButtonRef}
            href={data.pressHref}
            data-editor-node-id="intro-press-button"
            data-editor-node-type="button"
            data-editor-node-label="Press Kit Button"
            style={getElementLayoutStyle(es, "intro-press-button")}
            className="w-full sm:w-auto rounded-2xl border border-white/40 bg-white/5 px-10 py-7 text-lg font-semibold text-white backdrop-blur-sm hover:border-white/65 hover:bg-white/15 transition-all min-h-[80px]"
          >
            {data.pressLabel}
          </a>
        </div>
      </div>
    </div>
  )
}
