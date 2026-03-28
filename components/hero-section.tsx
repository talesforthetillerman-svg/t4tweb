"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useContentAnimation } from "@/hooks/useScrollAnimation"

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)
  const animations = useContentAnimation(heroRef)

  // Variantes de animación local para elementos hero (solo entrada)
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
  }

  return (
    <section className="relative min-h-screen pt-16 pb-20 md:pt-20 md:pb-24 flex items-center justify-center overflow-hidden">
      {/* Background image - hero (unique, no repetir) */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/sections/hero-bg.jpg"
          alt="Hero background"
          fill
          className="object-cover"
          priority
        />
        {/* Improved overlay for better text readability */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Background gradients - subtle */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />

      {/* Hero content - controlado por scroll cuando es visible */}
      <motion.div
        ref={heroRef}
        style={{
          opacity: animations.opacity,
          y: animations.y,
        }}
        className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-0 -mt-16"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 7, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          >
            <Image
              src="/images/logo-transparent.png"
              alt="Tales for the Tillerman Logo"
              width={260}
              height={260}
              className="mx-auto drop-shadow-2xl rounded-2xl filter brightness-110 contrast-125"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="font-serif text-4xl sm:text-5xl md:text-7xl text-foreground mb-2 md:mb-3 text-balance leading-tight"
        >
          Tales for the Tillerman
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto"
        >
          World music, funk, and soul from Berlin
        </motion.p>

        {/* Primary & Secondary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-10 md:mb-12"
        >
          <motion.a
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            href="#press-kit"
            aria-label="View band press kit"
            className="px-11 py-6 bg-primary text-primary-foreground rounded-lg text-lg md:text-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            View Press Kit
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            href="#contact"
            aria-label="Book Tales for the Tillerman"
            className="px-11 py-6 bg-secondary text-secondary-foreground rounded-lg text-lg md:text-xl font-semibold hover:bg-secondary/80 transition-all border border-border shadow-lg shadow-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Book the Band
          </motion.a>
        </motion.div>

        {/* Secondary Links - Social Networks (Discrete Chips) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="flex justify-center gap-3 flex-wrap"
        >
          <motion.a
            href="https://open.spotify.com/intl-es/artist/0FHjK3O0k8HQMrJsF7KQwF"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Listen on Spotify"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="chip-social"
          >
            <SpotifyIcon />
            <span>Spotify</span>
          </motion.a>
          <motion.a
            href="https://www.instagram.com/tales4tillerman"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow on Instagram"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="chip-social"
          >
            <InstagramIcon />
            <span>Instagram</span>
          </motion.a>
          <motion.a
            href="https://www.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Watch on YouTube"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="chip-social"
          >
            <YouTubeIcon />
            <span>YouTube</span>
          </motion.a>
          <motion.a
            href="https://linktr.ee/tales4tillerman"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="All links - Linktree"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="chip-social"
          >
            <LinktreeIcon />
            <span>Linktree</span>
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <a href="#about" aria-label="Scroll down">
          <svg
            className="w-6 h-6 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </a>
      </div>
    </section>
  )
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      whileHover={{ scale: 1.1, y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </motion.a>
  )
}

function SpotifyIcon() {
  return (
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function LinktreeIcon() {
  return (
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7.953 15.066l-.038-4.295h4.147v4.295H7.953zm0-12.066l4.109 4.128-2.07 2.093 2.07 2.093-4.109 4.128V3zm8.094 0v12.442l-4.109-4.128 2.07-2.093-2.07-2.093L16.047 3zM16.047 15.066v4.295h-4.147v-4.295h4.147z" />
    </svg>
  )
}
