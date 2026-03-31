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

      <SceneSection id="hero">
        <HeroSection />
      </SceneSection>

      <div className="relative h-[350px] w-full overflow-hidden md:h-[450px] lg:h-[520px]">
        <img
          src="/images/t4tPics/banner-crop.gif"
          alt="Animated boat and waves"
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/60 to-transparent md:h-32" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/60 to-transparent md:h-32" />
      </div>

      <LatestReleaseSection />

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

      <Footer />
    </main>
  )
}