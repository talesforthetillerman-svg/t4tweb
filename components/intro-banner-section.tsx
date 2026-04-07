"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { useVisualEditor } from "@/components/visual-editor"

export function IntroBannerSection() {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()
  
  const bannerGifRef = useRef<HTMLImageElement>(null)
  const bannerTextRef = useRef<HTMLParagraphElement>(null)
  const bookButtonRef = useRef<HTMLAnchorElement>(null)
  const pressButtonRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!isEditing) return

    if (bannerGifRef.current) {
      registerEditable({
        id: 'intro-banner-gif',
        type: 'image',
        label: 'Banner GIF',
        parentId: null,
        element: bannerGifRef.current,
        originalRect: bannerGifRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerGifRef.current.offsetWidth, height: bannerGifRef.current.offsetHeight },
      })
    }

    if (bannerTextRef.current) {
      registerEditable({
        id: 'intro-banner-text',
        type: 'text',
        label: 'Banner Text',
        parentId: null,
        element: bannerTextRef.current,
        originalRect: bannerTextRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerTextRef.current.offsetWidth, height: bannerTextRef.current.offsetHeight },
      })
    }

    if (bookButtonRef.current) {
      registerEditable({
        id: 'intro-book-button',
        type: 'button',
        label: 'Book Band Button',
        parentId: null,
        element: bookButtonRef.current,
        originalRect: bookButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bookButtonRef.current.offsetWidth, height: bookButtonRef.current.offsetHeight },
      })
    }

    if (pressButtonRef.current) {
      registerEditable({
        id: 'intro-press-button',
        type: 'button',
        label: 'Press Kit Button',
        parentId: null,
        element: pressButtonRef.current,
        originalRect: pressButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: pressButtonRef.current.offsetWidth, height: pressButtonRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('intro-banner-gif')
      unregisterEditable('intro-banner-text')
      unregisterEditable('intro-book-button')
      unregisterEditable('intro-press-button')
    }
  }, [isEditing, registerEditable, unregisterEditable])

  return (
    <div 
      data-editor-node-id="intro-section"
      data-editor-node-type="section"
      data-editor-node-label="Intro Section"
      className="relative flex flex-col items-center justify-center gap-4 px-2 pt-8 pb-12 sm:px-4 sm:pt-12 sm:pb-16"
    >
      <img
        ref={bannerGifRef}
        src="/images/t4tPics/banner-crop-ezgif.com-gif-maker.gif"
        alt="Animated banner"
        data-editor-node-id="intro-banner-gif"
        data-editor-node-type="image"
        data-editor-node-label="Banner GIF"
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div className="relative z-10 flex flex-col items-center justify-center gap-4">
        <p 
          ref={bannerTextRef}
          data-editor-node-id="intro-banner-text"
          data-editor-node-type="text"
          data-editor-node-label="Banner Text"
          className="max-w-2xl text-center text-base leading-relaxed text-white/90 sm:text-lg md:text-xl px-4"
        >
          Tales for the Tillerman brings groove-driven live energy to festivals, 
          clubs and special events — with a warm, rhythmic sound made to move a room.
        </p>
        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
          <a
            ref={bookButtonRef}
            href="#contact"
            data-editor-node-id="intro-book-button"
            data-editor-node-type="button"
            data-editor-node-label="Book Band Button"
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-10 py-7 text-lg font-bold text-white shadow-xl shadow-[#FF8C21]/50 transition-all min-h-[80px]"
          >
            Book the Band
          </a>

          <a
            ref={pressButtonRef}
            href="#press-kit"
            data-editor-node-id="intro-press-button"
            data-editor-node-type="button"
            data-editor-node-label="Press Kit Button"
            className="w-full sm:w-auto rounded-2xl border border-white/40 bg-white/5 px-10 py-7 text-lg font-semibold text-white backdrop-blur-sm hover:border-white/65 hover:bg-white/15 transition-all min-h-[80px]"
          >
            View Press Kit
          </a>
        </div>
      </div>
    </div>
  )
}
