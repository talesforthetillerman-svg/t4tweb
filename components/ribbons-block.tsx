"use client"

import { Ribbons } from "@/components/Ribbons"
import { useVisualEditor } from "@/components/visual-editor"
import { useState } from "react"

export function RibbonsBlock() {
  const { isEditing } = useVisualEditor()
  const [isTouchDevice] = useState(() => {
    if (typeof window === "undefined") return false
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    )
  })

  if (isEditing || isTouchDevice) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[1]">
      <Ribbons
        colors={["#FF8C21"]}
        baseSpring={0.04}
        baseFriction={0.83}
        baseThickness={30}
        offsetFactor={0.06}
        maxAge={650}
        pointCount={50}
        speedMultiplier={0.6}
        enableFade={false}
        enableShaderEffect={false}
        effectAmplitude={2}
      />
    </div>
  )
}
