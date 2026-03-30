import Image from "next/image"
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
import { FloatingBookingBar } from "@/components/floating-booking-bar"

export default function Home() {
  return (
    <main className="relative bg-black">
      <Navigation />

      <SceneSection id="hero">
        <HeroSection />
      </SceneSection>

      <section className="relative -mt-12 w-full overflow-hidden bg-transparent md:-mt-16 lg:-mt-20">
        <div className="relative h-[360px] w-full md:h-[430px] lg:h-[500px]">
          <Image
            src="/images/banner.gif"
            alt="Animated boat and waves"
            fill
            className="object-cover object-bottom opacity-80"
            style={{
              clipPath: "inset(18% 0 0 0)",
            }}
            unoptimized
            priority
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black via-black/65 via-black/30 to-transparent md:h-48 lg:h-56" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/65 via-black/30 to-transparent md:h-48 lg:h-56" />
          <div className="pointer-events-none absolute inset-0 bg-black/20" />
        </div>
      </section>

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

      <FloatingBookingBar />

      <div className="h-12 w-full bg-gradient-to-b from-black to-transparent md:h-16" aria-hidden />
    </main>
  )
}