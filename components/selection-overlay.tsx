"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { RuntimeEntry } from "./visual-editor"

interface SelectionOverlayProps {
  entry: RuntimeEntry
}

export function SelectionOverlay({ entry }: SelectionOverlayProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const isSection = entry.type === "section"

  useEffect(() => {
    let rafId: number | null = null
    const applyRect = () => {
      const rect = entry.element.getBoundingClientRect()
      if (!boxRef.current) return
      boxRef.current.style.left = `${rect.left}px`
      boxRef.current.style.top = `${rect.top}px`
      boxRef.current.style.width = `${rect.width}px`
      boxRef.current.style.height = `${rect.height}px`
    }
    const tick = () => {
      applyRect()
      rafId = window.requestAnimationFrame(tick)
    }
    tick()
    const syncOnce = () => applyRect()
    const observer = new ResizeObserver(syncOnce)
    observer.observe(entry.element)
    window.addEventListener("resize", syncOnce)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncOnce)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [entry])

  return createPortal(
    <div data-editor-overlay className="fixed inset-0 pointer-events-none z-[9990]">
      <div
        ref={boxRef}
        className={`absolute border-2 ${
          isSection
            ? "border-[#22c55e] shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_0_12px_rgba(34,197,94,0.2)]"
            : "border-[#FF8C21] shadow-[0_0_0_1px_rgba(255,140,33,0.3),0_0_12px_rgba(255,140,33,0.15)]"
        }`}
      >
        {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => (
          <div
            key={handle}
            data-editor-resize-handle={handle}
            data-editor-resize-node-id={entry.id}
            className={`absolute h-3 w-3 rounded-sm border border-white bg-[#FF8C21] shadow ${
              handle === "nw" ? "-left-2 -top-2 cursor-nwse-resize" :
              handle === "n" ? "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize" :
              handle === "ne" ? "-right-2 -top-2 cursor-nesw-resize" :
              handle === "e" ? "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" :
              handle === "se" ? "-bottom-2 -right-2 cursor-nwse-resize" :
              handle === "s" ? "bottom-[-0.5rem] left-1/2 -translate-x-1/2 cursor-ns-resize" :
              handle === "sw" ? "-bottom-2 -left-2 cursor-nesw-resize" :
              "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize"
            }`}
            style={{ pointerEvents: "auto" }}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}
