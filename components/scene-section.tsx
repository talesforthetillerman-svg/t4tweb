"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { useContentAnimation } from "@/hooks/useScrollAnimation"
import { useVisualEditor } from "@/components/visual-editor"

interface SceneSectionProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function SceneSection({ id, children, className = "" }: SceneSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const contentAnimations = useContentAnimation(sectionRef)
  const { isEditing } = useVisualEditor()

  return (
    <section
      ref={sectionRef}
      id={id}
      data-editor-node-id={`scene-section-${id}`}
      data-editor-node-type="section"
      data-editor-node-label={`Scene Section: ${id}`}
      className={`relative min-h-screen w-full overflow-hidden ${className}`}
    >
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {isEditing ? (
          <div className="w-full">{children}</div>
        ) : (
          <motion.div
            style={{
              opacity: contentAnimations.opacity,
              y: contentAnimations.y,
            }}
            className="w-full"
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  )
}
