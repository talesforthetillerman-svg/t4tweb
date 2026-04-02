"use client"
import { useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [heroImageSrc, setHeroImageSrc] = useState<string>("/images/t4tPics/hero-bg.jpg")

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.06])
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 35])

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-screen w-full items-stretch overflow-hidden bg-black"
    >
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <motion.div
          style={{ scale: backgroundScale, y: backgroundY }}
          className="relative h-full w-full"
        >
          <Image
            src={heroImageSrc}
            alt="Tales for the Tillerman live atmosphere"
            fill
            priority
            unoptimized
            sizes="100vw"
            onError={() => {
              if (heroImageSrc !== "/images/sections/hero-bg.jpg") {
                setHeroImageSrc("/images/sections/hero-bg.jpg")
              }
            }}
            className="object-cover"
            style={{ objectPosition: "center 58%" }}
          />
        </motion.div>
      </div>

      <div className="absolute inset-0 -z-10 bg-black/33" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 via-transparent to-black/58" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_62%,#00000088_12%,transparent_82%)]" />

      <motion.div
        animate={{ opacity: [0.10, 0.24, 0.10] }}
        transition={{ duration: 16, repeat: Infinity }}
        className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-[#FF8C21]/21 to-transparent"
      />

      <div className="relative z-30 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 pt-3 pb-6 sm:px-10 lg:px-14">
        
        <div className="flex flex-col items-center text-center mt-auto pb-4">
          
          <div className="flex flex-col items-center mb-4">
            <Image
              src="/images/t4tPics/logo-white.png"
              alt="Tales for the Tillerman logo"
              width={290}
              height={290}
              priority
              className="h-[106px] w-[106px] object-contain drop-shadow-2xl sm:h-[133px] sm:w-[133px] md:h-[160px] md:w-[160px]"
            />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.38em] text-[#ffd3a3]">
              BERLIN-BASED LIVE COLLECTIVE
            </p>
          </div>

          <h1 className="max-w-[880px] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.68rem]">
            A vibrant blend of{" "}
            <span className="bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent">
              funk, soul and world music
            </span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/90 sm:text-base md:text-[17px]">
            Tales for the Tillerman brings groove-driven live energy to festivals, 
            clubs and special events — with a warm, rhythmic sound made to move a room.
          </p>

          <div className="mt-6 flex w-full max-w-lg flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#contact"
              className="w-full sm:w-auto min-h-[48px] rounded-2xl bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-[#FF8C21]/50 transition-all"
            >
              Book the Band
            </motion.a>

            <motion.div 
              className="flex items-center gap-2 text-white/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <span className="text-[10px] uppercase tracking-[0.42em]">SCROLL</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.7} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
              </svg>
            </motion.div>

            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#press-kit"
              className="w-full sm:w-auto min-h-[48px] rounded-2xl border border-white/40 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm hover:border-white/65 hover:bg-white/15 transition-all"
            >
              View Press Kit
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  )
}
