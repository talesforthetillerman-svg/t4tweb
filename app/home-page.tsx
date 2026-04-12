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
import { loadBandMembersData } from "@/lib/sanity/band-members-loader"
import { loadLiveConcerts } from "@/lib/live-concerts-loader"
import { RibbonsBlock } from "@/components/ribbons-block"
import { HomeEditorStateApplier } from "@/components/home-editor-state-applier"
import { HomeEditorOverridesProvider } from "@/components/home-editor-overrides-provider"
import { loadHomeEditorState } from "@/lib/sanity/home-editor-state-loader"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"
import { getTraceNodeId } from "@/lib/sanity/env"

export const dynamic = "force-dynamic"

export default async function HomePage({ perspective = "published" }: { perspective?: "published" | "previewDrafts" } = {}) {
  const traceNodeId = getTraceNodeId()
  const [heroData, navigationData, introBannerData, bandMembersData, liveConcerts, homeEditorNodes] = await Promise.all([
    loadHeroData(),
    loadNavigationData(),
    loadIntroBannerData(),
    loadBandMembersData(),
    loadLiveConcerts(),
    loadHomeEditorState(perspective),
  ])
  const latestReleaseNodeOverrides = homeEditorNodes
    .filter((node) => node.nodeId.startsWith("latest-release-"))
    .reduce<Record<string, HomeEditorNodeOverride>>((acc, node) => {
      acc[node.nodeId] = node
      return acc
    }, {})
  const bandMembersNodeOverrides = homeEditorNodes
    .filter((node) => node.nodeId.startsWith("band-members-") || node.nodeId.startsWith("member-item-"))
    .reduce<Record<string, HomeEditorNodeOverride>>((acc, node) => {
      acc[node.nodeId] = node
      return acc
    }, {})
  const liveNodeOverrides = homeEditorNodes
    .filter((node) => node.nodeId.startsWith("live-"))
    .reduce<Record<string, HomeEditorNodeOverride>>((acc, node) => {
      acc[node.nodeId] = node
      return acc
    }, {})
  const aboutNodeOverrides = homeEditorNodes
    .filter((node) => node.nodeId.startsWith("about-"))
    .reduce<Record<string, HomeEditorNodeOverride>>((acc, node) => {
      acc[node.nodeId] = node
      return acc
    }, {})
  const pressKitNodeOverrides = homeEditorNodes
    .filter((node) => node.nodeId.startsWith("press-kit-"))
    .reduce<Record<string, HomeEditorNodeOverride>>((acc, node) => {
      acc[node.nodeId] = node
      return acc
    }, {})
  const contactNodeOverrides = homeEditorNodes
    .filter((node) => node.nodeId.startsWith("contact-"))
    .reduce<Record<string, HomeEditorNodeOverride>>((acc, node) => {
      acc[node.nodeId] = node
      return acc
    }, {})
  const footerNodeOverrides = homeEditorNodes
    .filter((node) => node.nodeId.startsWith("footer-"))
    .reduce<Record<string, HomeEditorNodeOverride>>((acc, node) => {
      acc[node.nodeId] = node
      return acc
    }, {})

  return (
    <main className="relative overflow-x-clip bg-black">
      <HomeEditorOverridesProvider nodes={homeEditorNodes}>
        <HomeEditorStateApplier nodes={homeEditorNodes} />
        <RibbonsBlock />
        <Navigation data={navigationData} />

        <HeroSectionWrapper data={heroData} />

        <SectionDivider editorId="section-divider-hero-intro" />

        <IntroBannerSection data={introBannerData} />

        <SectionDivider editorId="section-divider-intro-release" />

        <LatestReleaseSection overrides={latestReleaseNodeOverrides} />

        <SectionDivider editorId="section-divider-release-about" />

        <SceneSection id="about">
          <AboutSection overrides={aboutNodeOverrides} />
        </SceneSection>

        <SectionDivider editorId="section-divider-about-press" />

        <SceneSection id="press-kit">
          <PressKitSection overrides={pressKitNodeOverrides} />
        </SceneSection>

        <SectionDivider editorId="section-divider-press-band" />

        <SceneSection id="band">
          <BandMembersSection initialMembers={bandMembersData} overrides={bandMembersNodeOverrides} />
        </SceneSection>

        <SectionDivider editorId="section-divider-band-live" />

        <SceneSection id="live">
          <LiveSection initialConcerts={liveConcerts} overrides={liveNodeOverrides} />
        </SceneSection>

        <SectionDivider editorId="section-divider-live-contact" />

        <SceneSection id="contact">
          <ContactSection overrides={contactNodeOverrides} />
        </SceneSection>

        <SectionDivider editorId="section-divider-contact-footer" />

        <Footer overrides={footerNodeOverrides} />
      </HomeEditorOverridesProvider>
    </main>
  )
}