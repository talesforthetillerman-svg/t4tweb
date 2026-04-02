"use client"
import { useRef, useEffect, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import { client } from "@/lib/sanity/client"
import { heroQuery } from "@/lib/sanity/queries"

const FALLBACK = {
  title: "A vibrant blend of",
  titleHighlight: "funk, soul and world music",
  subtitle: "BERLIN-BASED LIVE COLLECTIVE",
  logoUrl: "/images/t4tPics/logo-white.png",
  bgUrl: "/images/t4tPics/hero-bg.jpg",
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [data, setData] = useState<typeof FALLBACK | null>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.06])
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 35])

  useEffect(() => {
    client.fetch(heroQuery).then((data) => {
      if (data && (data.bgUrl || data.title)) {
        setData({
          title: data.title || FALLBACK.title,
          titleHighlight: data.titleHighlight || FALLBACK.titleHighlight,
          subtitle: data.subtitle || FALLBACK.subtitle,
          logoUrl: data.logoUrl || FALLBACK.logoUrl,
          bgUrl: data.bgUrl || FALLBACK.bgUrl,
        })
      } else {
        setData(FALLBACK)
      }
    }).catch(() => setData(FALLBACK))
  }, [])

  const content = data || FALLBACK

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-screen w-full items-stretch overflow-hidden bg-black"
    >
      <div className="absolute inset-0 z-0">
        <motion.div
          style={{ scale: backgroundScale, y: backgroundY }}
          className="relative h-full w-full"
        >
          <Image
            src={content.bgUrl}
            alt="Tales for the Tillerman live atmosphere"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "center center" }}
          />
        </motion.div>
      </div>

      <div className="absolute inset-0 z-[1] bg-black/33" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-transparent to-black/58" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_62%,#00000088_12%,transparent_82%)]" />

      <motion.div
        animate={{ opacity: [0.10, 0.24, 0.10] }}
        transition={{ duration: 16, repeat: Infinity }}
        className="absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-[#FF8C21]/21 to-transparent"
      />

      <div className="relative z-10 flex min-h-screen w-full flex-col justify-end px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center pb-8 pt-16">
          <h1 className="max-w-[880px] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.9rem] mb-6">
            {content.title}{" "}
            <span className="bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent">
              {content.titleHighlight}
            </span>
          </h1>

          <div className="flex flex-col items-center">
            <Image
              src={content.logoUrl}
              alt="Tales for the Tillerman logo"
              width={290}
              height={290}
              priority
              className="h-[141px] w-[141px] object-contain drop-shadow-2xl sm:h-[177px] sm:w-[177px] md:h-[213px] md:w-[213px]"
            />
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.38em] text-[#ffd3a3]">
              {content.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 hidden sm:flex items-center gap-3 text-white/80">
        <span className="text-lg uppercase tracking-[0.42em]">SCROLL</span>
        <svg className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={2.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>
    </section>
  )
}
