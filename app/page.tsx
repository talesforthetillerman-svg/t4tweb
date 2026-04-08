import { HeroSectionWrapper } from "@/components/hero-section-wrapper"
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
import { IntroBannerSection } from "@/components/intro-banner-section"
import { loadHeroData } from "@/lib/sanity/hero-loader"
import { loadNavigationData } from "@/lib/sanity/navigation-loader"
import { loadIntroBannerData } from "@/lib/sanity/intro-banner-loader"
import { RibbonsBlock } from "@/components/ribbons-block"

/** Always refetch hero from Sanity (editor deploy + revalidate); avoids stale static shell in dev). */
export const dynamic = "force-dynamic"

export default async function Home() {
  const [heroData, navigationData, introBannerData] = await Promise.all([
    loadHeroData(),
    loadNavigationData(),
    loadIntroBannerData(),
  ])

  return (
    <main
      data-editor-node-id="home-page-main"
      data-editor-node-type="section"
      data-editor-node-label="Home Page Main"
      className="relative bg-black"
    >
      <RibbonsBlock />
      <Navigation data={navigationData} />

      <HeroSectionWrapper data={heroData} />

      <SectionDivider editorId="section-divider-hero-intro" />

      <IntroBannerSection data={introBannerData} />

      <SectionDivider editorId="section-divider-intro-release" />

      <SceneSection id="latest-release">
        <LatestReleaseSection />
      </SceneSection>

      <SectionDivider editorId="section-divider-release-about" />

      <SceneSection id="about">
        <AboutSection />
      </SceneSection>

      <SectionDivider editorId="section-divider-about-press" />

      <SceneSection id="press-kit">
        <PressKitSection />
      </SceneSection>

      <SectionDivider editorId="section-divider-press-band" />

      <SceneSection id="band">
        <BandMembersSection />
      </SceneSection>

      <SectionDivider editorId="section-divider-band-live" />

      <SceneSection id="live">
        <LiveSection />
      </SceneSection>

      <SectionDivider editorId="section-divider-live-contact" />

      <SceneSection id="contact">
        <ContactSection />
      </SceneSection>

      <SectionDivider editorId="section-divider-contact-footer" />

      <Footer />
    </main>
  )
}
