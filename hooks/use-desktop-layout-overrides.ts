"use client"

import { useEffect, useState } from "react"

/**
 * Geometry overrides from desktop editing (x/y/width/height/scale) should only
 * affect desktop rendering. On mobile/tablet we keep responsive CSS layout.
 */
export function useDesktopLayoutOverridesEnabled(forceEnable = false): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (forceEnable) return true
    if (typeof window === "undefined") return false
    return window.matchMedia("(min-width: 1024px)").matches
  })

  useEffect(() => {
    if (forceEnable) return
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const update = () => setEnabled(mediaQuery.matches)
    mediaQuery.addEventListener("change", update)
    return () => {
      mediaQuery.removeEventListener("change", update)
    }
  }, [forceEnable])

  return forceEnable || enabled
}
