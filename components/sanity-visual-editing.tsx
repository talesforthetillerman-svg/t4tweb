"use client"

import { enableVisualEditing } from "@sanity/visual-editing"
import { useEffect } from "react"

export function SanityVisualEditing() {
  useEffect(() => {
    // Enable visual editing when component mounts
    const disable = enableVisualEditing({
      // The preview URL is configured in sanity.config.ts
      // This component just enables the visual editing overlay
    })

    // Clean up when component unmounts
    return () => {
      disable()
    }
  }, [])

  return null
}