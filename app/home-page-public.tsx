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
import { loadHeroDataWithDraft } from "@/lib/sanity/hero-loader-with-draft"
import { loadNavigationData } from "@/lib/sanity/navigation-loader"
import { loadIntroBannerData } from "@/lib/sanity/intro-banner-loader"
import { loadBandMembersData } from "@/lib/sanity/band-members-loader"
import { loadLiveConcerts } from "@/lib/live-concerts-loader"
import { RibbonsBlock } from "@/components/ribbons-block"

export const dynamic = "force-dynamic"

export default async function HomePagePublic() {
  const [heroData, navigationData, introBannerData, bandMembersData, liveConcerts] = await Promise.all([
    loadHeroDataWithDraft(),
    loadNavigationData(),
    loadIntroBannerData(),
    loadBandMembersData(),
    loadLiveConcerts(),
  ])

  console.log("[NAVBAR-TRACE] home-page-public received navigationData:", {
    elementStyles: Object.keys(navigationData.elementStyles),
    "nav-logo": navigationData.elementStyles["nav-logo"],
    "nav-brand-name": navigationData.elementStyles["nav-brand-name"],
  })

  return (
    <main className="relative overflow-x-clip bg-black">
      <RibbonsBlock />
      <Navigation data={navigationData} />

      <HeroSectionWrapper data={heroData} />

      <SectionDivider editorId="section-divider-hero-intro" />

      <IntroBannerSection data={introBannerData} />

      <SectionDivider editorId="section-divider-intro-release" />

      <LatestReleaseSection />

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
        <BandMembersSection initialMembers={bandMembersData.members} elementStyles={bandMembersData.elementStyles} />
      </SceneSection>

      <SectionDivider editorId="section-divider-band-live" />

      <SceneSection id="live">
        <LiveSection initialConcerts={liveConcerts} />
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
