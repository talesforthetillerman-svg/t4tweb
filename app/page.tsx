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

export default function Home() {
  return (
    <main className="relative bg-black">
      <Navigation />

      <HeroSection />

      <SectionDivider />

      <div 
        className="relative flex flex-col items-center justify-center gap-4 px-2 pt-8 pb-12 sm:px-4 sm:pt-12 sm:pb-16"
        data-editable
        data-edit-type="section"
        data-edit-field="introBanner"
        data-edit-label="Intro Banner"
      >
        <img
          src="/images/t4tPics/banner-crop-ezgif.com-gif-maker.gif"
          alt="Animated banner"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          data-editable
          data-edit-type="image"
          data-edit-field="introBanner.background"
          data-edit-label="Banner Background"
        />
        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <p 
            className="max-w-2xl text-center text-base leading-relaxed text-white/90 sm:text-lg md:text-xl px-4"
            data-editable
            data-edit-type="text"
            data-edit-field="introBanner.description"
            data-edit-label="Intro Text"
          >
            Tales for the Tillerman brings groove-driven live energy to festivals, 
            clubs and special events — with a warm, rhythmic sound made to move a room.
          </p>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            <a
              href="#contact"
              className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-10 py-7 text-lg font-bold text-white shadow-xl shadow-[#FF8C21]/50 transition-all min-h-[80px]"
              data-editable
              data-edit-type="link"
              data-edit-field="introBanner.bookBandCta"
              data-edit-label="Book Band Button"
            >
              Book the Band
            </a>

            <a
              href="#press-kit"
              className="w-full sm:w-auto rounded-2xl border border-white/40 bg-white/5 px-10 py-7 text-lg font-semibold text-white backdrop-blur-sm hover:border-white/65 hover:bg-white/15 transition-all min-h-[80px]"
              data-editable
              data-edit-type="link"
              data-edit-field="introBanner.pressKitCta"
              data-edit-label="Press Kit Button"
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
