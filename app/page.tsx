"use client"

import { HeroSection } from "@/components/hero-section"
import { SectionDivider } from "@/components/section-divider"
import { AboutSection } from "@/components/about-section"
import { PressKitSection } from "@/components/press-kit-section"
import { BandMembersSection } from "@/components/band-members-section"
import { LiveSection } from "@/components/live-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { SceneSection } from "@/components/scene-section"
import { LatestReleaseSection } from "@/components/latest-release-section"
import { useEffect, useRef } from "react"
import { useVisualEditor } from "@/components/visual-editor"

export default function Home() {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()
  
  // Editable refs for the banner section
  const bannerSectionRef = useRef<HTMLDivElement>(null)
  const bannerImageRef = useRef<HTMLImageElement>(null)
  const bannerTextRef = useRef<HTMLParagraphElement>(null)
  const bannerButtonsRef = useRef<HTMLDivElement>(null)
  const bookButtonRef = useRef<HTMLAnchorElement>(null)
  const pressButtonRef = useRef<HTMLAnchorElement>(null)

  // Register editable elements for banner section
  useEffect(() => {
    if (!isEditing) return

    if (bannerSectionRef.current) {
      registerEditable({
        id: 'intro-banner-section',
        type: 'section',
        label: 'Intro Banner',
        parentId: null,
        element: bannerSectionRef.current,
        originalRect: bannerSectionRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerSectionRef.current.offsetWidth, height: bannerSectionRef.current.offsetHeight },
      })
    }

    if (bannerImageRef.current) {
      registerEditable({
        id: 'intro-banner-image',
        type: 'image',
        label: 'Banner Image',
        parentId: 'intro-banner-section',
        element: bannerImageRef.current,
        originalRect: bannerImageRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerImageRef.current.offsetWidth, height: bannerImageRef.current.offsetHeight },
      })
    }

    if (bannerTextRef.current) {
      registerEditable({
        id: 'intro-banner-text',
        type: 'text',
        label: 'Banner Text',
        parentId: 'intro-banner-section',
        element: bannerTextRef.current,
        originalRect: bannerTextRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerTextRef.current.offsetWidth, height: bannerTextRef.current.offsetHeight },
      })
    }

    if (bannerButtonsRef.current) {
      registerEditable({
        id: 'intro-banner-buttons',
        type: 'box',
        label: 'Banner Buttons',
        parentId: 'intro-banner-section',
        element: bannerButtonsRef.current,
        originalRect: bannerButtonsRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bannerButtonsRef.current.offsetWidth, height: bannerButtonsRef.current.offsetHeight },
      })
    }

    if (bookButtonRef.current) {
      registerEditable({
        id: 'intro-book-button',
        type: 'button',
        label: 'Book Band Button',
        parentId: 'intro-banner-buttons',
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
        parentId: 'intro-banner-buttons',
        element: pressButtonRef.current,
        originalRect: pressButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: pressButtonRef.current.offsetWidth, height: pressButtonRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('intro-banner-section')
      unregisterEditable('intro-banner-image')
      unregisterEditable('intro-banner-text')
      unregisterEditable('intro-banner-buttons')
      unregisterEditable('intro-book-button')
      unregisterEditable('intro-press-button')
    }
  }, [isEditing, registerEditable, unregisterEditable])

  return (
    <main className="relative bg-black">
      <Navigation />

      <HeroSection />

      <SectionDivider />

      <div 
        ref={bannerSectionRef}
        className="relative flex flex-col items-center justify-center gap-4 px-2 pt-8 pb-12 sm:px-4 sm:pt-12 sm:pb-16"
      >
        <img
          ref={bannerImageRef}
          src="/images/t4tPics/banner-crop-ezgif.com-gif-maker.gif"
          alt="Animated banner"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <p 
            ref={bannerTextRef}
            className="max-w-2xl text-center text-base leading-relaxed text-white/90 sm:text-lg md:text-xl px-4"
          >
            Tales for the Tillerman brings groove-driven live energy to festivals, 
            clubs and special events — with a warm, rhythmic sound made to move a room.
          </p>
          <div ref={bannerButtonsRef} className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            <a
              ref={bookButtonRef}
              href="#contact"
              data-edit-id="intro-book-button"
              data-edit-type="button"
              data-edit-label="Book Band Button"
              className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-10 py-7 text-lg font-bold text-white shadow-xl shadow-[#FF8C21]/50 transition-all min-h-[80px]"
            >
              Book the Band
            </a>

            <a
              ref={pressButtonRef}
              href="#press-kit"
              data-edit-id="intro-press-button"
              data-edit-type="button"
              data-edit-label="Press Kit Button"
              className="w-full sm:w-auto rounded-2xl border border-white/40 bg-white/5 px-10 py-7 text-lg font-semibold text-white backdrop-blur-sm hover:border-white/65 hover:bg-white/15 transition-all min-h-[80px]"
            >
              View Press Kit
            </a>
          </div>
        </div>
      </div>

      <SectionDivider />

      <SceneSection id="latest-release">
        <LatestReleaseSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="about">
        <AboutSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="press-kit">
        <PressKitSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="band">
        <BandMembersSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="live">
        <LiveSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="contact">
        <ContactSection />
      </SceneSection>

      <SectionDivider />

      <Footer />
    </main>
  )
}
