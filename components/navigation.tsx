"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useVisualEditor } from "@/components/visual-editor"
import { useHomeEditorImageSrc } from "@/components/home-editor-overrides-provider"
import { useDesktopLayoutOverridesEnabled } from "@/hooks/use-desktop-layout-overrides"
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
import type { NavigationData } from "@/lib/sanity/navigation-loader"

export function Navigation({ data }: { data: NavigationData }) {
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const allowGeometryOverrides = useDesktopLayoutOverridesEnabled(isEditing)

  // Refs for editable elements
  const navRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const logoLinkRef = useRef<HTMLAnchorElement>(null)
  const brandNameRef = useRef<HTMLSpanElement>(null)
  const bookButtonRef = useRef<HTMLAnchorElement>(null)
  const navLinkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const mobileLinkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const mobileBookButtonRef = useRef<HTMLAnchorElement>(null)

  const navLinks = data.links
  const resolvedNavLogoSrc = useHomeEditorImageSrc("nav-logo", data.brandLogoUrl || "/images/logo-qr.png")
  const navigationRootStyle = getElementLayoutStyle(data.elementStyles, "navigation", { includeGeometry: allowGeometryOverrides })
  const navigationInnerStyle = getElementLayoutStyle(data.elementStyles, "navigation-inner", { includeGeometry: allowGeometryOverrides })

  // Register editable elements when editing
  useEffect(() => {
    if (!isEditing) return

    if (navRef.current) {
      registerEditable({
        id: 'navigation',
        type: 'section',
        label: 'Navigation',
        parentId: null,
        element: navRef.current,
        originalRect: navRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: navRef.current.offsetWidth, height: Math.min(navRef.current.offsetHeight, 120) },
      })
    }

    if (logoRef.current) {
      registerEditable({
        id: 'nav-logo',
        type: 'image',
        label: 'Logo Image',
        parentId: 'navigation',
        element: logoRef.current,
        originalRect: logoRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: logoRef.current.offsetWidth, height: logoRef.current.offsetHeight },
      })
    }

    if (brandNameRef.current) {
      registerEditable({
        id: 'nav-brand-name',
        type: 'text',
        label: 'Brand Name',
        parentId: 'navigation',
        element: brandNameRef.current,
        originalRect: brandNameRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: brandNameRef.current.offsetWidth, height: brandNameRef.current.offsetHeight },
      })
    }

    navLinkRefs.current.forEach((ref, index) => {
      if (ref) {
        registerEditable({
          id: `nav-link-${index}`,
          type: 'button',
          label: navLinks[index]?.label || `Link ${index}`,
          parentId: 'navigation',
          element: ref,
          originalRect: ref.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: ref.offsetWidth, height: ref.offsetHeight },
        })
      }
    })

    if (bookButtonRef.current) {
      registerEditable({
        id: 'nav-book-button',
        type: 'button',
        label: 'Book Button',
        parentId: 'navigation',
        element: bookButtonRef.current,
        originalRect: bookButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: bookButtonRef.current.offsetWidth, height: bookButtonRef.current.offsetHeight },
      })
    }

    mobileLinkRefs.current.forEach((ref, index) => {
      if (ref) {
        registerEditable({
          id: `nav-mobile-link-${index}`,
          type: 'button',
          label: `Mobile ${navLinks[index]?.label || `Link ${index}`}`,
          parentId: 'navigation',
          element: ref,
          originalRect: ref.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: ref.offsetWidth, height: ref.offsetHeight },
        })
      }
    })

    if (mobileBookButtonRef.current) {
      registerEditable({
        id: 'nav-mobile-book-button',
        type: 'button',
        label: 'Mobile Book Button',
        parentId: 'navigation',
        element: mobileBookButtonRef.current,
        originalRect: mobileBookButtonRef.current.getBoundingClientRect(),
        transform: { x: 0, y: 0 },
        dimensions: { width: mobileBookButtonRef.current.offsetWidth, height: mobileBookButtonRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('navigation')
      unregisterEditable('nav-logo')
      unregisterEditable('nav-brand-name')
      navLinks.forEach((_, i) => unregisterEditable(`nav-link-${i}`))
      unregisterEditable('nav-book-button')
      navLinks.forEach((_, i) => unregisterEditable(`nav-mobile-link-${i}`))
      unregisterEditable('nav-mobile-book-button')
    }
  }, [isEditing, navLinks, registerEditable, unregisterEditable])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])

  const navLinkClass =
    "inline-flex items-center rounded-lg px-3 py-2 text-[0.8125rem] font-medium tracking-wide !text-white/65 transition-colors duration-200 hover:!text-white lg:px-3.5 lg:text-[0.875rem]"

  const primaryCtaClass =
    "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C21] via-[#FF7C00] to-[#FF6C00] px-5 py-2.5 text-[0.875rem] font-semibold !text-white shadow-lg shadow-[#FF8C21]/20 transition-all duration-200 hover:shadow-xl hover:shadow-[#FF8C21]/30 lg:px-6 lg:py-3 lg:text-[0.9375rem]"

  const mobileLinkClass =
    "block w-full border-b border-white/10 py-3.5 text-left text-[0.9375rem] font-medium !text-white/80 transition-colors hover:!text-white"

  return (
    <nav
      ref={navRef}
      data-editor-node-id="navigation"
      data-editor-node-type="section"
      data-editor-node-label="Navigation"
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "backdrop-blur-2xl border-b border-white/10 shadow-xl shadow-black/25"
          : "bg-transparent"
      }`}
      style={{ ...navigationRootStyle, boxShadow: isScrolled ? "0 10px 30px rgba(0,0,0,0.25)" : "none" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center md:h-[5.5rem]">
          <div
            data-editor-node-id="navigation-inner"
            data-editor-node-type="card"
            data-editor-node-label="Navigation Inner Container"
            className="flex h-16 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 md:h-[4.5rem] md:px-4"
            style={navigationInnerStyle}
          >
            <a
              ref={logoLinkRef}
              href="#top"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full p-0 transition-transform duration-300 hover:-translate-y-0.5 sm:h-12 sm:gap-3 md:h-14"
            >
              <div
                ref={logoRef}
                data-editor-node-id="nav-logo"
                data-editor-node-type="image"
                data-editor-node-label="Logo Image"
                className="relative h-full w-auto rounded-full shadow-lg shadow-black/30 overflow-hidden"
                style={{
                  width: "clamp(2.75rem, 9vw, 3.5rem)",
                  height: "clamp(2.75rem, 9vw, 3.5rem)",
                  ...getElementLayoutStyle(data.elementStyles, "nav-logo", { includeGeometry: allowGeometryOverrides }),
                }}
              >
                <Image
                  src={resolvedNavLogoSrc}
                  alt="Tales for the Tillerman"
                  fill
                  className="object-cover"
                />
              </div>
              <span 
                ref={brandNameRef}
                className="hidden font-serif text-lg font-medium tracking-wide text-white sm:text-xl md:block lg:text-2xl"
                data-editor-node-id="nav-brand-name"
                data-editor-node-type="text"
                data-editor-node-label="Brand Name"
                style={getElementLayoutStyle(data.elementStyles, "nav-brand-name", { includeGeometry: allowGeometryOverrides })}
              >
                {data.brandName}
              </span>
            </a>

            <div className="hidden items-center gap-0.5 md:flex md:gap-1 lg:gap-2">
              {navLinks.map((link, index) => (
                <a 
                  key={link.href} 
                  ref={(el) => { navLinkRefs.current[index] = el }}
                  href={link.href} 
                  className={navLinkClass}
                  data-editor-node-id={`nav-link-${index}`}
                  data-editor-node-type="button"
                  data-editor-node-label={`Nav Link: ${link.label}`}
                  style={getElementLayoutStyle(data.elementStyles, `nav-link-${index}`, { includeGeometry: allowGeometryOverrides })}
                >
                  {link.label}
                </a>
              ))}
              <a 
                ref={bookButtonRef}
                href={data.ctaHref || "#contact"}
                data-editor-node-id="nav-book-button"
                data-editor-node-type="button"
                data-editor-node-label="Book Button"
                className={`${primaryCtaClass} ml-2 shrink-0 lg:ml-3`}
                style={getElementLayoutStyle(data.elementStyles, "nav-book-button", { includeGeometry: allowGeometryOverrides })}
              >
                {data.ctaLabel || "Book"}
              </a>
            </div>

            <div className="flex shrink-0 items-center md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-foreground transition-colors hover:bg-white/20 sm:h-11 sm:w-11"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav-panel"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div
            id="mobile-nav-panel"
            className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/10 pb-5 pt-2.5 md:hidden"
            style={{ maxHeight: "calc(100vh - 4.5rem)" }}
          >
            <div className="rounded-xl border border-white/10 bg-black/95 px-2 backdrop-blur-sm">
              {navLinks.map((link, index) => (
                <a
                  key={link.href}
                  ref={(el) => { mobileLinkRefs.current[index] = el }}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-[48px] w-full items-center border-b border-white/10 px-4 text-left text-base font-medium text-white/80 transition-colors hover:text-white last:border-b-0"
                  data-editor-node-id={`nav-mobile-link-${index}`}
                  data-editor-node-type="button"
                  data-editor-node-label={`Mobile Nav: ${link.label}`}
                  style={getElementLayoutStyle(data.elementStyles, `nav-mobile-link-${index}`, { includeGeometry: allowGeometryOverrides })}
                >
                  {link.label}
                </a>
              ))}
              <div className="px-2 pt-4 pb-2">
                <a
                  ref={mobileBookButtonRef}
                  href={data.ctaHref || "#contact"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${primaryCtaClass} flex min-h-[48px] w-full items-center justify-center py-3.5 text-center`}
                  data-editor-node-id="nav-mobile-book-button"
                  data-editor-node-type="button"
                  data-editor-node-label="Mobile Book Button"
                  style={getElementLayoutStyle(data.elementStyles, "nav-mobile-book-button", { includeGeometry: allowGeometryOverrides })}
                >
                  {data.ctaLabel || "Book the band"}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
