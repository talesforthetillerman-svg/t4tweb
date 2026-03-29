"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })

  // Logo animations - Parallax más lento, desaparece con botones
  const logoOpacity = useTransform(scrollYProgress, [0, 0.92, 1], [1, 1, 0])
  const logoY = useTransform(scrollYProgress, [0, 0.98], [0, 200])

  // Buttons opacity - Desaparecen con el logo
  const buttonsOpacity = useTransform(scrollYProgress, [0, 0.88, 1], [1, 1, 0])

  // Text animations - Inicia más abajo, desaparece después
  const textOpacity = useTransform(scrollYProgress, [0.05, 0.25, 0.75], [1, 1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.5], [40, -40])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-screen overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0 -z-10 w-full h-full">
        <Image
          src="/images/t4tPics/hero-bg.jpg"
          alt="Hero background"
          fill
          priority
          sizes="100vw"
          className="object-cover w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center -25%" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70 w-full h-full" />
        {/* Animated accent glow */}
        <motion.div
          animate={{
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="absolute inset-0 bg-gradient-to-r from-[#FF8C21]/0 via-[#FF8C21]/8 to-[#FF8C21]/0 w-full h-full"
        />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 min-h-screen w-full flex flex-col justify-between px-4 sm:px-6 lg:px-10 pt-8 md:pt-12 pb-32 md:pb-48">
        
        {/* Logo - Positioned lower, larger, slower parallax */}
        <motion.div
          style={{
            opacity: logoOpacity,
            y: logoY,
          }}
          className="flex justify-center"
        >
          <Image
            src="/images/t4tPics/logo-white.png"
            alt="Tales for the Tillerman Logo"
            width={336}
            height={336}
            className="drop-shadow-2xl"
            priority
          />
        </motion.div>

        {/* Text & Buttons - Bottom of page */}
        <motion.div
          style={{
            opacity: textOpacity,
            y: textY,
          }}
          className="flex flex-col items-center gap-8"
        >
          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white text-center font-light tracking-wide max-w-4xl"
          >
            World music, funk, and soul from Berlin
          </motion.p>

          {/* CTA Buttons - Disappear with logo */}
          <motion.div
            style={{ opacity: buttonsOpacity }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 50px rgba(255, 140, 33, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
              href="#press-kit"
              className="px-10 py-4 bg-gradient-to-r from-[#FF8C21] via-[#FF7C00] to-[#FF6C00] text-white rounded-lg text-lg md:text-xl font-bold leading-none shadow-xl shadow-[#FF8C21]/40 hover:shadow-2xl hover:shadow-[#FF8C21]/60 transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
            >
              View Press Kit
            </motion.a>

            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.65 }}
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
              whileTap={{ scale: 0.95 }}
              href="#contact"
              className="px-10 py-4 bg-white/10 text-white rounded-lg text-lg md:text-xl font-bold border border-white/40 backdrop-blur-sm hover:backdrop-blur-md transition-all duration-300 shadow-xl shadow-white/5 hover:shadow-2xl hover:shadow-white/10 transform hover:-translate-y-1 active:scale-95"
            >
              Book the Band
            </motion.a>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="mt-8 flex justify-center"
          >
            <svg
              className="w-6 h-6 text-white/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade transition */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-black/30 to-black w-full pointer-events-none z-20" />
    </section>
  )
}
