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

      <SceneSection id="hero" imageSrc="/images/t4t-1.jpg" imageAlt="Band hero scene">
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

      <SceneSection id="about" imageSrc="/images/t4t-2.jpg" imageAlt="About band scene">
        <AboutSection />
      </SceneSection>

      <SectionDivider />

      <section className="relative -mt-12 w-full overflow-hidden bg-transparent md:-mt-16 lg:-mt-20">
        <div className="relative h-[300px] w-full md:h-[350px] lg:h-[400px]">
          <Image
            src="/images/banner.gif"
            alt="Animated boat and waves"
            fill
            className="object-cover object-bottom opacity-80"
            style={{
              clipPath: "inset(18% 0 0 0)",
            }}
            unoptimized
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black via-black/65 via-black/30 to-transparent md:h-44 lg:h-52" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/65 via-black/30 to-transparent md:h-44 lg:h-52" />
          <div className="pointer-events-none absolute inset-0 bg-black/20" />
        </div>
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

      <section className="relative -mt-10 w-full overflow-hidden bg-transparent md:-mt-12 lg:-mt-16">
        <div className="relative h-[220px] w-full md:h-[250px] lg:h-[280px]">
          <Image
            src="/images/banner.gif"
            alt="Animated boat and waves"
            fill
            className="object-cover object-bottom opacity-80"
            style={{
              clipPath: "inset(18% 0 0 0)",
            }}
            unoptimized
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black via-black/65 via-black/30 to-transparent md:h-36 lg:h-44" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/65 via-black/30 to-transparent md:h-36 lg:h-44" />
          <div className="pointer-events-none absolute inset-0 bg-black/20" />
        </div>
      </section>
    </main>
  )
}