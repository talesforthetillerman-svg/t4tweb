"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { useContentAnimation } from "@/hooks/useScrollAnimation"

interface SceneSectionProps {
  id: string
  imageSrc: string
  imageAlt: string
  children: React.ReactNode
  className?: string
}

export function SceneSection({
  id,
  imageSrc,
  imageAlt,
  children,
  className = "",
}: SceneSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const contentAnimations = useContentAnimation(sectionRef)

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative min-h-screen w-full overflow-hidden ${className}`}
    >
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <motion.div
          style={{
            opacity: contentAnimations.opacity,
            y: contentAnimations.y,
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </div>
    </section>
  )
}