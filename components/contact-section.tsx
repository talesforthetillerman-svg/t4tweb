"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.15, rootMargin: "-50px" }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="py-28 md:py-40 relative overflow-hidden min-h-[90vh] flex items-center"
    >
      {/* Background Image with blur and reduced opacity */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/Momo Garcia Manager.png"
          alt=""
          fill
          className="object-cover object-center blur-md scale-105"
        />
        {/* Dark overlay to ensure text readability - matching About section style */}
        <div className="absolute inset-0 bg-background/85" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/50" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
            Let&apos;s Work Together
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance">
            Book the Band
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-xl">
            Ready to bring the groove to your event? Get in touch with our management for bookings and inquiries.
          </p>
        </div>

        {/* Contact Options - Larger and more prominent */}
        <div
          className={`grid sm:grid-cols-2 gap-8 mb-14 transition-all duration-700 delay-200 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          {/* Email */}
          <a
            href="mailto:talesforthetillerman@gmail.com"
            className="group p-10 bg-card/90 backdrop-blur-sm rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <EmailIcon className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3">Email Us</h3>
            <p className="text-muted-foreground text-lg mb-5">
              For booking inquiries and collaborations
            </p>
            <span className="inline-flex items-center gap-2 text-primary font-medium text-lg">
              talesforthetillerman@gmail.com
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </a>

          {/* Telegram */}
          <a
            href="https://t.me/talesforthetillerman"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-10 bg-card/90 backdrop-blur-sm rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <TelegramIcon className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3">Telegram</h3>
            <p className="text-muted-foreground text-lg mb-5">
              Quick response for urgent matters
            </p>
            <span className="inline-flex items-center gap-2 text-primary font-medium text-lg">
              @talesforthetillerman
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </a>
        </div>

        {/* Main CTA Button - Much larger */}
        <div
          className={`text-center mb-12 transition-all duration-700 delay-300 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <a
            href="mailto:talesforthetillerman@gmail.com?subject=Booking%20Inquiry"
            className="inline-flex items-center gap-4 px-14 py-7 bg-primary text-primary-foreground rounded-xl font-semibold text-2xl hover:bg-primary/90 transition-all hover:scale-105 shadow-xl shadow-primary/25"
          >
            <CalendarIcon className="w-8 h-8" />
            Book Now
          </a>
        </div>

        {/* Animated Banner/GIF - Moved from Live section */}
        <div
          className={`transition-all duration-700 delay-400 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl max-w-2xl mx-auto">
            <Image
              src="/images/banner.gif"
              alt="Tales for the Tillerman animated banner"
              width={600}
              height={200}
              className="w-full"
              unoptimized
            />
          </div>
        </div>

        {/* Management Note */}
        <p
          className={`text-center text-muted-foreground text-lg mt-10 transition-all duration-700 delay-500 ease-out ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          Management: Momo Garcia
        </p>
      </div>
    </section>
  )
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}
