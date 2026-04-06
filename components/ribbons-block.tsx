"use client"

import { Ribbons } from "@/components/Ribbons"

export function RibbonsBlock() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1]">
      <Ribbons
        colors={["#972f0c"]}
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
