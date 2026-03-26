"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

export function AboutSection() {
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
      id="about"
      ref={sectionRef}
      className="py-28 md:py-40 relative overflow-hidden min-h-[90vh] flex items-center"
    >
      {/* Full Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/about-section.jpg"
          alt="Tales for the Tillerman live performance"
          fill
          className="object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/50" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Content */}
          <div
            className={`transition-all duration-1000 ease-out ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-16"
            }`}
          >
            <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
              About the Band
            </span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 text-balance">
              A Journey Through Sound
            </h2>
            <div className="space-y-5 text-muted-foreground leading-relaxed text-lg">
              <p>
                Tales for the Tillerman is a Berlin-based collective that weaves together 
                world music, funk, soul, and reggae into a vibrant tapestry of sound. 
                With roots spanning across continents, the band brings a unique fusion 
                that transcends borders and speaks to the universal language of rhythm.
              </p>
              <p>
                From intimate club shows to open-air festivals, the five-piece ensemble 
                delivers electrifying performances that move both body and soul. Their 
                music is a celebration of diversity, unity, and the timeless power of 
                live music.
              </p>
            </div>
          </div>

          {/* Stats Boxes */}
          <div
            className={`transition-all duration-1000 delay-300 ease-out ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-16"
            }`}
          >
            <div className="grid grid-cols-2 gap-6">
              <div className="p-8 bg-card/90 backdrop-blur-sm rounded-2xl border border-border">
                <div className="font-serif text-4xl md:text-5xl text-primary mb-2">5</div>
                <div className="text-muted-foreground">Musicians</div>
              </div>
              <div className="p-8 bg-card/90 backdrop-blur-sm rounded-2xl border border-border">
                <div className="font-serif text-4xl md:text-5xl text-primary mb-2">Berlin</div>
                <div className="text-muted-foreground">Based</div>
              </div>
              <div className="p-8 bg-card/90 backdrop-blur-sm rounded-2xl border border-border">
                <div className="font-serif text-4xl md:text-5xl text-primary mb-2">World</div>
                <div className="text-muted-foreground">Music Fusion</div>
              </div>
              <div className="p-8 bg-card/90 backdrop-blur-sm rounded-2xl border border-border">
                <div className="font-serif text-4xl md:text-5xl text-primary mb-2">Live</div>
                <div className="text-muted-foreground">Experience</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
