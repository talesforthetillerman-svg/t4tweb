"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.04])
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 36])

  const logoY = useTransform(scrollYProgress, [0, 1], [0, 18])
  const logoOpacity = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0.82])

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -18])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.86, 1], [1, 1, 0])

  const glowOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [0.18, 0.1, 0.04])

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-screen w-full items-stretch overflow-hidden"
    >
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <motion.div
          style={{
            scale: backgroundScale,
            y: backgroundY,
          }}
          className="relative h-full w-full"
        >
          <Image
            src="/images/t4tPics/hero-bg.jpg"
            alt="Tales for the Tillerman live atmosphere"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "center 10%" }}
          />
        </motion.div>
      </div>

      <div className="absolute inset-0 -z-10 bg-black/18" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/22 via-black/10 to-black/42" />
      <div className="absolute inset-y-0 left-0 -z-10 w-[18%] bg-gradient-to-r from-black/18 to-transparent" />
      <div className="absolute inset-y-0 right-0 -z-10 w-[18%] bg-gradient-to-l from-black/18 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[32%] bg-gradient-to-t from-black/45 via-black/18 to-transparent" />

      <motion.div
        style={{ opacity: glowOpacity }}
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#FF8C21]/0 via-[#FF8C21]/14 to-[#FF8C21]/0"
      />

      <div className="absolute left-1/2 top-[22%] -z-10 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#FF8C21]/10 blur-3xl md:h-[420px] md:w-[420px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-4 pt-24 pb-6 sm:px-6 sm:pt-28 md:pt-32 lg:px-10">
        <motion.div
          style={{
            y: logoY,
            opacity: logoOpacity,
          }}
          className="flex flex-col items-center pt-2 sm:pt-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative"
          >
            <motion.div
              animate={{
                opacity: [0.24, 0.38, 0.24],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 4.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF8C21]/16 blur-3xl sm:h-[260px] sm:w-[260px] md:h-[320px] md:w-[320px]"
            />

            <motion.div
              animate={{
                y: [0, -5, 0],
                filter: [
                  "drop-shadow(0 10px 30px rgba(0,0,0,0.45))",
                  "drop-shadow(0 14px 40px rgba(255,140,33,0.20))",
                  "drop-shadow(0 10px 30px rgba(0,0,0,0.45))",
                ],
              }}
              transition={{
                duration: 5.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <Image
                src="/images/t4tPics/logo-white.png"
                alt="Tales for the Tillerman logo"
                width={206}
                height={206}
                priority
                className="h-[134px] w-[134px] object-contain sm:h-[164px] sm:w-[164px] md:h-[196px] md:w-[196px]"
              />
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.14 }}
            className="mt-5 text-[0.78rem] font-semibold uppercase tracking-[0.32em] text-[#ffd3a3] sm:text-sm"
          >
            Berlin-based live collective
          </motion.p>
        </motion.div>

        <motion.div
          style={{
            y: contentY,
            opacity: contentOpacity,
          }}
          className="mx-auto flex w-full max-w-5xl flex-col items-center text-center pb-10 sm:pb-14 md:pb-18 lg:pb-24"
        >
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.22 }}
            className="max-w-5xl text-4xl font-semibold leading-[0.98] text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            A vibrant blend of
            <span className="bg-gradient-to-r from-[#FFB15A] via-[#FF8C21] to-[#FF6C00] bg-clip-text text-transparent">
              {" "}
              funk, soul and world music
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.34 }}
            className="mt-6 max-w-3xl text-base leading-relaxed text-white/88 sm:text-lg md:text-xl"
          >
            Tales for the Tillerman brings groove-driven live energy to festivals,
            clubs and special events — with a warm, rhythmic sound made to move a room.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.46 }}
            className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
          >
            <motion.a
              whileHover={{
                scale: 1.03,
                boxShadow: "0 20px 50px rgba(255, 140, 33, 0.34)",
              }}
              whileTap={{ scale: 0.98 }}
              href="#contact"
              className="flex min-h-[52px] min-w-[220px] items-center justify-center rounded-xl border border-[#ffb36b]/35 bg-gradient-to-r from-[#FF8C21] via-[#FF7C00] to-[#FF6C00] px-8 py-3.5 text-center text-base font-bold text-white shadow-xl shadow-[#FF8C21]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#FF8C21]/40 md:min-h-[56px] md:py-4 md:text-lg"
            >
              Book the Band
            </motion.a>

            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              href="#press-kit"
              className="flex min-h-[52px] min-w-[220px] items-center justify-center rounded-xl border border-white/25 bg-white/[0.06] px-8 py-3.5 text-center text-base font-semibold text-white/95 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/[0.1] md:min-h-[56px] md:py-4 md:text-lg"
            >
              View Press Kit
            </motion.a>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 1, delay: 1 },
          y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
      >
        <a
          href="#about"
          className="flex flex-col items-center gap-2 text-white/60 transition-colors hover:text-white/90"
        >
          <span className="text-[0.68rem] uppercase tracking-[0.28em]">
            Scroll
          </span>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </a>
      </motion.div>
    </section>
  )
}