"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const navLinks = [
    { href: "#about", label: "About" },
    { href: "#press-kit", label: "Press" },
    { href: "#band", label: "Band" },
    { href: "#live", label: "Live" },
    { href: "#contact", label: "Contact" },
  ]

  const navLinkClass =
    "inline-flex items-center rounded-lg px-3 py-2 text-[0.8125rem] font-medium tracking-wide !text-white/65 transition-colors duration-200 hover:!text-white lg:px-3.5 lg:text-[0.875rem]"

  const primaryCtaClass =
    "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C21] via-[#FF7C00] to-[#FF6C00] px-5 py-2.5 text-[0.875rem] font-semibold !text-white shadow-lg shadow-[#FF8C21]/20 transition-all duration-200 hover:shadow-xl hover:shadow-[#FF8C21]/30 lg:px-6 lg:py-3 lg:text-[0.9375rem]"

  const mobileLinkClass =
    "block w-full border-b border-white/10 py-3.5 text-left text-[0.9375rem] font-medium !text-white/80 transition-colors hover:!text-white"

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-black/80 backdrop-blur-2xl border-b border-white/10 shadow-xl shadow-black/25"
          : "bg-transparent"
      }`}
      style={{ boxShadow: isScrolled ? "0 10px 30px rgba(0,0,0,0.25)" : "none" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center md:h-[5.5rem]">
          <div className="flex h-16 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 md:h-[4.5rem] md:px-4">
            <a
              href="#top"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-full p-0 transition-transform duration-300 hover:-translate-y-0.5 md:h-14"
            >
              <Image
                src="/images/logo-qr.png"
                alt="Tales for the Tillerman"
                width={56}
                height={56}
                className="h-full w-auto rounded-full shadow-lg shadow-black/30"
              />
              <span className="hidden font-serif text-lg font-medium tracking-wide text-white sm:text-xl md:block lg:text-2xl">
                Tales for the Tillerman
              </span>
            </a>

            <div className="hidden items-center gap-0.5 md:flex md:gap-1 lg:gap-2">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className={navLinkClass}>
                  {link.label}
                </a>
              ))}
              <a href="#contact" className={`${primaryCtaClass} ml-2 shrink-0 lg:ml-3`}>
                Book
              </a>
            </div>

            <div className="flex shrink-0 items-center md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-foreground transition-colors hover:bg-white/20"
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
          <div id="mobile-nav-panel" className="border-t border-white/10 pb-6 pt-3 md:hidden">
            <div className="rounded-xl border border-white/10 bg-black/95 px-2 backdrop-blur-sm">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-[48px] w-full items-center border-b border-white/10 px-4 text-left text-base font-medium text-white/80 transition-colors hover:text-white last:border-b-0"
                >
                  {link.label}
                </a>
              ))}
              <div className="px-2 pt-4 pb-2">
                <a
                  href="#contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${primaryCtaClass} flex min-h-[48px] w-full items-center justify-center py-3.5 text-center`}
                >
                  Book the band
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
