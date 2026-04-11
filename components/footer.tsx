"use client"

import { useRef, useEffect } from "react"
import Image from "next/image"
import { useVisualEditor } from "@/components/visual-editor"
import { useHomeEditorImageSrc } from "@/components/home-editor-overrides-provider"
import { useDesktopLayoutOverridesEnabled } from "@/hooks/use-desktop-layout-overrides"
import type { CSSProperties } from "react"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

interface FooterProps {
  overrides?: Record<string, HomeEditorNodeOverride>
}

function buildInlineStyleFromOverride(
  override: HomeEditorNodeOverride | undefined,
  includeGeometry: boolean
): CSSProperties | undefined {
  if (!override) return undefined
  const style: CSSProperties = {}
  const scale = typeof override.style.scale === "number" ? Math.max(0.1, override.style.scale) : 1
  if (includeGeometry && (override.explicitPosition || (override.explicitStyle && scale !== 1))) {
    style.transform =
      scale !== 1
        ? `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px) scale(${scale})`
        : `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px)`
    style.transformOrigin = "top left"
  }
  if (includeGeometry && override.explicitSize) {
    style.width = `${Math.max(8, Math.round(override.geometry.width))}px`
    style.height = `${Math.max(8, Math.round(override.geometry.height))}px`
  }
  if (override.explicitStyle) {
    if (override.style.opacity !== undefined) style.opacity = override.style.opacity
    if (override.style.backgroundColor) style.backgroundColor = override.style.backgroundColor
    if (override.style.color) style.color = override.style.color
    if (override.style.fontSize) style.fontSize = override.style.fontSize
    if (override.style.fontFamily) style.fontFamily = override.style.fontFamily
    if (override.style.fontWeight) style.fontWeight = override.style.fontWeight as CSSProperties["fontWeight"]
    if (override.style.fontStyle) style.fontStyle = override.style.fontStyle as CSSProperties["fontStyle"]
    if (override.style.textDecoration) style.textDecoration = override.style.textDecoration as CSSProperties["textDecoration"]
    if (override.style.minHeight) style.minHeight = override.style.minHeight
    if (override.style.paddingTop) style.paddingTop = override.style.paddingTop
    if (override.style.paddingBottom) style.paddingBottom = override.style.paddingBottom
  }
  return Object.keys(style).length > 0 ? style : undefined
}

function resolveTextOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const text = override.content.text?.trim()
  return text ? text : fallback
}

function resolveHrefOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const href = override.content.href?.trim()
  return href ? href : fallback
}

function resolveImageSrcOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const src = override.content.src?.trim()
  return src ? src : fallback
}

export function Footer({ overrides = {} }: FooterProps) {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()
  const allowGeometryOverrides = useDesktopLayoutOverridesEnabled(isEditing)
  const footerRef = useRef<HTMLElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const socialGroupRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const copyrightRef = useRef<HTMLParagraphElement>(null)
  const footerSectionOverride = overrides["footer-section"]
  const footerLogoOverride = overrides["footer-logo"]
  const footerDescriptionOverride = overrides["footer-description"]
  const footerCtaOverride = overrides["footer-cta"]
  const footerSocialGroupOverride = overrides["footer-social-group"]
  const footerDividerOverride = overrides["footer-divider"]
  const footerCopyrightOverride = overrides["footer-copyright"]
  const resolvedFooterLogoSrc = useHomeEditorImageSrc(
    "footer-logo",
    resolveImageSrcOverride(footerLogoOverride, "/images/t4tPics/logo-white.png")
  )

  useEffect(() => {
    if (!isEditing) return

    // Delay registration to ensure all refs are populated
    const timer = setTimeout(() => {
      if (footerRef.current) {
        registerEditable({
          id: 'footer-section',
          type: 'section',
          label: 'Footer Section',
          parentId: null,
          element: footerRef.current,
          originalRect: footerRef.current.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: footerRef.current.offsetWidth, height: footerRef.current.offsetHeight },
        })
      }

      if (logoRef.current) {
        registerEditable({
          id: 'footer-logo',
          type: 'image',
          label: 'Footer Logo',
          parentId: null,
          element: logoRef.current,
          originalRect: logoRef.current.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: logoRef.current.offsetWidth, height: logoRef.current.offsetHeight },
        })
      }

      if (descRef.current) {
        registerEditable({
          id: 'footer-description',
          type: 'text',
          label: 'Footer Description',
          parentId: null,
          element: descRef.current,
          originalRect: descRef.current.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: descRef.current.offsetWidth, height: descRef.current.offsetHeight },
        })
      }

      if (ctaRef.current) {
        registerEditable({
          id: 'footer-cta',
          type: 'button',
          label: 'Book the Band',
          parentId: null,
          element: ctaRef.current,
          originalRect: ctaRef.current.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: ctaRef.current.offsetWidth, height: ctaRef.current.offsetHeight },
        })
      }

      if (socialGroupRef.current) {
        registerEditable({
          id: 'footer-social-group',
          type: 'card',
          label: 'Footer Social Links',
          parentId: null,
          element: socialGroupRef.current,
          originalRect: socialGroupRef.current.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: socialGroupRef.current.offsetWidth, height: socialGroupRef.current.offsetHeight },
        })
      }

      if (dividerRef.current) {
        registerEditable({
          id: 'footer-divider',
          type: 'card',
          label: 'Footer Divider',
          parentId: null,
          element: dividerRef.current,
          originalRect: dividerRef.current.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: dividerRef.current.offsetWidth, height: dividerRef.current.offsetHeight },
        })
      }

      if (copyrightRef.current) {
        registerEditable({
          id: 'footer-copyright',
          type: 'text',
          label: 'Footer Copyright',
          parentId: null,
          element: copyrightRef.current,
          originalRect: copyrightRef.current.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: copyrightRef.current.offsetWidth, height: copyrightRef.current.offsetHeight },
        })
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      unregisterEditable('footer-section')
      unregisterEditable('footer-logo')
      unregisterEditable('footer-description')
      unregisterEditable('footer-cta')
      unregisterEditable('footer-social-group')
      unregisterEditable('footer-divider')
      unregisterEditable('footer-copyright')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const streamingPlatforms = [
    {
      name: "Spotify",
      href: "https://open.spotify.com/intl-es/artist/0FHjK3O0k8HQMrJsF7KQwF",
      icon: SpotifyIcon,
    },
    {
      name: "Apple Music",
      href: "https://music.apple.com/us/artist/tales-for-the-tillerman/1819840222",
      icon: AppleMusicIcon,
    },
    {
      name: "YouTube Music",
      href: "https://music.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ",
      icon: YouTubeIcon,
    },
    {
      name: "Amazon Music",
      href: "https://music.amazon.co.uk/artists/B0FCNWCSZC/tales-for-the-tillerman",
      icon: AmazonIcon,
    },
    {
      name: "Bandcamp",
      href: "https://talesforthetillerman.bandcamp.com/",
      icon: BandcampIcon,
    },
    {
      name: "Bandsintown",
      href: "https://www.bandsintown.com/a/15468933-tales-for-the-tillerman",
      icon: BandsinTownIcon,
    },
  ]

  const socialLinks = [
    {
      id: "footer-social-instagram",
      name: "Instagram",
      href: "https://www.instagram.com/tales4tillerman",
      icon: InstagramIcon,
    },
    {
      id: "footer-social-youtube",
      name: "YouTube",
      href: "https://www.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ",
      icon: YouTubeIcon,
    },
    {
      id: "footer-social-telegram",
      name: "Telegram",
      href: "https://t.me/talesforthetillerman",
      icon: TelegramIcon,
    },
    {
      id: "footer-social-linktree",
      name: "Linktree",
      href: "https://linktr.ee/tales4tillerman",
      icon: LinktreeIcon,
    },
  ]
  const footerDescription = resolveTextOverride(
    footerDescriptionOverride,
    "Berlin-based world music collective blending funk, soul, and reggae."
  )
  const footerCtaLabel = resolveTextOverride(footerCtaOverride, "Book the Band")
  const footerCtaHref = resolveHrefOverride(footerCtaOverride, "#contact")
  const footerCopyright = resolveTextOverride(footerCopyrightOverride, `© ${new Date().getFullYear()} Tales for the Tillerman`)

  return (
    <footer 
      ref={footerRef}
      data-editor-node-id="footer-section"
      data-editor-node-type="section"
      data-editor-node-label="Footer Section"
      className="bg-black"
      style={buildInlineStyleFromOverride(footerSectionOverride, allowGeometryOverrides)}
    >
      <div className="h-5 bg-gradient-to-b from-black/40 to-black sm:h-7" />
      
      <div className="mx-auto max-w-4xl px-4 py-8 text-center sm:px-6 sm:py-11">
        
        <div 
          ref={logoRef}
          data-editor-node-id="footer-logo"
          data-editor-node-type="image"
          data-editor-node-label="Footer Logo"
          className="mb-4 sm:mb-6"
          style={buildInlineStyleFromOverride(footerLogoOverride, allowGeometryOverrides)}
        >
          <Image
            src={resolvedFooterLogoSrc}
            alt="Tales for the Tillerman"
            width={160}
            height={160}
            className="mx-auto h-auto w-[clamp(6rem,24vw,9.5rem)] object-contain"
          />
        </div>

        <p 
          ref={descRef}
          data-editor-node-id="footer-description"
          data-editor-node-type="text"
          data-editor-node-label="Footer Description"
          className="mx-auto mb-5 max-w-2xl px-2 text-sm text-white/70 sm:mb-6 sm:text-lg"
          style={buildInlineStyleFromOverride(footerDescriptionOverride, allowGeometryOverrides)}
        >
          {footerDescription}
        </p>

        <div className="mb-7 px-2">
          <a
            ref={ctaRef}
            data-editor-node-id="footer-cta"
            data-editor-node-type="button"
            data-editor-node-label="Book the Band"
            href={footerCtaHref}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF8C21]/30 transition-all hover:shadow-xl hover:shadow-[#FF8C21]/40 sm:w-auto sm:px-8 sm:py-3 sm:text-base"
            style={buildInlineStyleFromOverride(footerCtaOverride, allowGeometryOverrides)}
          >
            {footerCtaLabel}
          </a>
        </div>

        <div 
          ref={socialGroupRef}
          data-editor-node-id="footer-social-group"
          data-editor-node-type="card"
          data-editor-node-label="Footer Social Links"
          data-editor-grouped="true"
          data-link-group-summary="Footer Social Links"
          className="mb-7 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          style={buildInlineStyleFromOverride(footerSocialGroupOverride, allowGeometryOverrides)}
        >
          {socialLinks.map((link) => (
            <a
              key={link.id}
              data-editor-node-id={link.id}
              data-editor-node-type="button"
              data-editor-node-label={`Footer ${link.name}`}
              data-link-item="true"
              data-link-item-name={link.name}
              href={resolveHrefOverride(overrides[link.id], link.href)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.name}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-primary sm:h-12 sm:w-12"
              style={buildInlineStyleFromOverride(overrides[link.id], allowGeometryOverrides)}
            >
              <link.icon />
            </a>
          ))}
        </div>

        <div 
          ref={dividerRef}
          data-editor-node-id="footer-divider"
          data-editor-node-type="card"
          data-editor-node-label="Footer Divider"
          className="border-t border-white/10 pt-5 sm:pt-6"
          style={buildInlineStyleFromOverride(footerDividerOverride, allowGeometryOverrides)}
        >
          <p 
            ref={copyrightRef}
            data-editor-node-id="footer-copyright"
            data-editor-node-type="text"
            data-editor-node-label="Footer Copyright"
            className="text-white/40 text-sm text-center"
            style={buildInlineStyleFromOverride(footerCopyrightOverride, allowGeometryOverrides)}
          >
            {footerCopyright}
          </p>
        </div>
      </div>
    </footer>
  )
}

function SpotifyIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function LinktreeIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7.953 15.066l-.038-4.295h4.147v4.295H7.953zm0-12.066l4.109 4.128-2.07 2.093 2.07 2.093-4.109 4.128V3zm8.094 0v12.442l-4.109-4.128 2.07-2.093-2.07-2.093L16.047 3zM16.047 15.066v4.295h-4.147v-4.295h4.147z" />
    </svg>
  )
}

function AppleMusicIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.098 10.638c0-1.1.08-2.267.244-3.57 0-.603.528-1.1 1.117-1.1.59 0 1.12.497 1.12 1.1-.206 1.303-.326 2.47-.326 3.57 0 8.998 5.291 16.594 12.061 20.15h-.003c.4.23.654.668.654 1.15 0 .744-.603 1.346-1.345 1.346-.527 0-.996-.31-1.212-.744-.259-.528-.528-1.057-.806-1.646h-1.923c-.28.59-.548 1.12-.806 1.646-.216.435-.685.744-1.212.744-.742 0-1.345-.603-1.345-1.346 0-.482.254-.92.654-1.15 6.77-3.556 12.061-11.152 12.061-20.15zm-6.055 1.104c0 .836.68 1.516 1.516 1.516.835 0 1.515-.68 1.515-1.516 0-.835-.68-1.515-1.515-1.515-.836 0-1.516.68-1.516 1.515zm8.993 6.057c-.683 0-1.237.554-1.237 1.237 0 .683.554 1.238 1.237 1.238.684 0 1.238-.555 1.238-1.238 0-.683-.554-1.237-1.238-1.237zm-14.22-8.76c1.1 1.1 1.897 2.678 1.897 4.45 0 3.553-2.898 6.451-6.452 6.451-3.553 0-6.451-2.898-6.451-6.451 0-1.772.797-3.35 1.897-4.45C-2.09 8.537-2.696 6.264-2.696 3.76c0-5.516 4.48-9.996 9.996-9.996 5.516 0 9.996 4.48 9.996 9.996 0 2.504-.607 4.777-1.59 6.825z" />
    </svg>
  )
}

function AmazonIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.5 10.5c0-.8.7-1.5 1.5-1.5h14c.8 0 1.5.7 1.5 1.5v1H3.5v-1zm0 3h17v4c0 .8-.7 1.5-1.5 1.5H5c-.8 0-1.5-.7-1.5-1.5v-4z" />
    </svg>
  )
}

function BandcampIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5.51 2H2.72A1.97 1.97 0 0 0 .75 3.97v16.06A1.97 1.97 0 0 0 2.72 22h16.06a1.97 1.97 0 0 0 1.97-1.97V3.97A1.97 1.97 0 0 0 18.78 2H5.51zm5.96 11.37l-4.15 5.54h4.15V13.37z" />
    </svg>
  )
}

function BandsinTownIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm3-10c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm-2 0c0-1.105-.895-2-2-2s-2 .895-2 2 .895 2 2 2 2-.895 2-2z" />
    </svg>
  )
}
