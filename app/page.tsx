import Image from "next/image"
import { HeroSection } from "@/components/hero-section"
import { QuickActionsSection } from "@/components/quick-actions-section"
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

      <SceneSection id="hero" imageSrc="/images/t4t-1.jpg" imageAlt="Band hero scene">
        <HeroSection />
      </SceneSection>

      <QuickActionsSection />

      <LatestReleaseSection />

      <SectionDivider />

      <SceneSection id="about" imageSrc="/images/t4t-2.jpg" imageAlt="About band scene">
        <AboutSection />
      </SceneSection>

      <SectionDivider />

      {/* Banner Section - Between About and Press Kit */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/3 to-black" style={{ minHeight: "200px", clipPath: "inset(47% 0 0 0)" }}>
        <Image
          src="/images/banner.gif"
          alt="Tales for the Tillerman animated banner"
          width={1200}
          height={300}
          className="w-full h-auto object-cover"
          unoptimized
        />
      </section>

      <SectionDivider />

      <SceneSection id="press-kit" imageSrc="/images/t4t-3.jpg" imageAlt="Press kit scene">
        <PressKitSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="band" imageSrc="/images/t4t-4.jpg" imageAlt="Band members scene">
        <BandMembersSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="live" imageSrc="/images/band-live.jpg" imageAlt="Live show scene">
        <LiveSection />
      </SceneSection>

      <SectionDivider />

      <SceneSection id="contact" imageSrc="/images/DSC_4710.JPG" imageAlt="Contact scene">
        <ContactSection />
      </SceneSection>

      <Footer />

      <FloatingBookingBar />

      {/* Banner Footer - After Footer */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-primary/5 via-primary/3 to-black" style={{ minHeight: "150px", clipPath: "inset(47% 0 0 0)" }}>
        <Image
          src="/images/banner.gif"
          alt="Tales for the Tillerman animated banner"
          width={1200}
          height={200}
          className="w-full h-auto object-cover"
          unoptimized
        />
      </section>
    </main>
  )
}
