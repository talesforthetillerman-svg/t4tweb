'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useContentAnimation } from '@/hooks/useScrollAnimation'

interface ContentSectionProps {
  id: string
  children: React.ReactNode
  className?: string
}

/**
 * ContentSection: full-viewport content block with scroll animation.
 * If used inside SceneSection, do not pass the same `id` as the parent (duplicate ids).
 */
export function ContentSection({
  id,
  children,
  className = '',
}: ContentSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const animations = useContentAnimation(sectionRef)

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative min-h-screen flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <motion.div
        style={{
          opacity: animations.opacity,
          y: animations.y,
        }}
        className="w-full mx-auto max-w-6xl"
      >
        {children}
      </motion.div>
    </section>
  )
}
