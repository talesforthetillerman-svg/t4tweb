"use client"

import { useEffect, useRef } from "react"

interface RibbonsProps {
  colors?: string[]
  baseSpring?: number
  baseFriction?: number
  baseThickness?: number
  offsetFactor?: number
  maxAge?: number
  pointCount?: number
  speedMultiplier?: number
  enableFade?: boolean
  enableShaderEffect?: boolean
  effectAmplitude?: number
}

type TrailPoint = {
  x: number
  y: number
  age: number
}

export function Ribbons({
  colors = ["#972f0c"],
  baseSpring = 0.04,
  baseFriction = 0.83,
  baseThickness = 30,
  offsetFactor = 0.06,
  maxAge = 650,
  pointCount = 50,
  speedMultiplier = 0.6,
  enableFade = false,
  effectAmplitude = 2,
}: RibbonsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let rafId = 0
    let lastTs = performance.now()

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const velocity = { x: 0, y: 0 }
    const head = { x: pointer.x, y: pointer.y }
    const trail: TrailPoint[] = []

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * window.devicePixelRatio)
      canvas.height = Math.floor(height * window.devicePixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
    }

    const onMove = (event: MouseEvent | PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }

    resize()
    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onMove, { passive: true })

    const tick = (ts: number) => {
      const dt = Math.min(32, ts - lastTs)
      lastTs = ts

      const dx = pointer.x - head.x
      const dy = pointer.y - head.y
      velocity.x = (velocity.x + dx * baseSpring) * baseFriction
      velocity.y = (velocity.y + dy * baseSpring) * baseFriction

      head.x += velocity.x * speedMultiplier
      head.y += velocity.y * speedMultiplier

      trail.unshift({ x: head.x, y: head.y, age: 0 })
      if (trail.length > pointCount) trail.length = pointCount

      for (let i = 0; i < trail.length; i += 1) {
        trail[i].age += dt
      }

      while (trail.length && trail[trail.length - 1].age > maxAge) {
        trail.pop()
      }

      ctx.clearRect(0, 0, width, height)
      if (trail.length > 1) {
        const color = colors[0] || "#972f0c"
        for (let i = 0; i < trail.length - 1; i += 1) {
          const p1 = trail[i]
          const p2 = trail[i + 1]
          const t = i / Math.max(1, trail.length - 1)
          const alpha = enableFade ? 1 - t : 0.85
          const wobble = Math.sin((ts / 300) + i * offsetFactor) * effectAmplitude
          const thickness = Math.max(1, baseThickness * (1 - t * 0.85))

          ctx.strokeStyle = color
          ctx.globalAlpha = alpha
          ctx.lineWidth = thickness
          ctx.lineCap = "round"
          ctx.beginPath()
          ctx.moveTo(p1.x + wobble, p1.y - wobble)
          ctx.lineTo(p2.x - wobble, p2.y + wobble)
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onMove)
      window.cancelAnimationFrame(rafId)
    }
  }, [baseFriction, baseSpring, baseThickness, colors, effectAmplitude, enableFade, maxAge, offsetFactor, pointCount, speedMultiplier])

  return <canvas ref={canvasRef} className="pointer-events-none block h-full w-full" aria-hidden="true" />
}
