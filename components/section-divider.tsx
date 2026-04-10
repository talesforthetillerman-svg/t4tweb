"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useVisualEditor } from "@/components/visual-editor"

interface SectionDividerProps {
  editorId: string
}

export function SectionDivider({ editorId }: SectionDividerProps) {
  const dividerRef = useRef<HTMLDivElement>(null)
  const { isEditing, registerEditable, unregisterEditable } = useVisualEditor()

  useEffect(() => {
    if (!isEditing || !dividerRef.current) return

    registerEditable({
      id: editorId,
      type: "background",
      label: "Section Divider",
      parentId: null,
      element: dividerRef.current,
      originalRect: dividerRef.current.getBoundingClientRect(),
      transform: { x: 0, y: 0 },
      dimensions: { width: dividerRef.current.offsetWidth, height: dividerRef.current.offsetHeight },
    })

    return () => {
      unregisterEditable(editorId)
    }
  }, [editorId, isEditing, registerEditable, unregisterEditable])

  return (
    <motion.div
      ref={dividerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      data-editor-node-id={editorId}
      data-editor-node-type="background"
      data-editor-node-label="Section Divider"
      className="relative h-8 w-full bg-gradient-to-b from-transparent via-black/10 to-transparent md:h-12"
    />
  )
}
