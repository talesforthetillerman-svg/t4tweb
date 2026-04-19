"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import Image from "next/image"
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
import type { AboutData } from "@/lib/sanity/about-loader"
import { useVisualEditor } from "@/components/visual-editor"

interface AboutSectionProps {
  className?: string
  data: AboutData
}

function getAboutBoxStyle(elementStyles: AboutData["elementStyles"], nodeId: string): CSSProperties {
  const rawStyle = elementStyles[nodeId]
  const style = { ...getElementLayoutStyle(elementStyles, nodeId) }
  if (typeof rawStyle?.backgroundColor === "string") style.backgroundColor = rawStyle.backgroundColor
  delete style.opacity
  return style
}

function getAboutSectionStyle(elementStyles: AboutData["elementStyles"]): CSSProperties {
  const rawStyle = elementStyles["about-section"]
  const height = rawStyle?.height
  const includeGeometry = typeof height !== "number" || height >= 640
  const style = { ...getElementLayoutStyle(elementStyles, "about-section", { includeGeometry }) }
  if (typeof rawStyle?.backgroundColor === "string") style.backgroundColor = rawStyle.backgroundColor
  delete style.opacity
  return style
}

function hasUsableAboutButtonGeometry(rawStyle: Record<string, unknown> | undefined): boolean {
  if (!rawStyle) return true
  const width = rawStyle.width
  const height = rawStyle.height
  const x = rawStyle.x
  const y = rawStyle.y
  if (typeof width === "number" && width < 48) return false
  if (typeof height === "number" && height < 24) return false
  if (typeof x === "number" && Math.abs(x) > 900) return false
  if (typeof y === "number" && Math.abs(y) > 480) return false
  return true
}

function getAboutCopyButtonStyle(elementStyles: AboutData["elementStyles"]): CSSProperties {
  const rawStyle = elementStyles["about-copy-button"]
  const includeGeometry = hasUsableAboutButtonGeometry(rawStyle)
  const style = { ...getElementLayoutStyle(elementStyles, "about-copy-button", { includeGeometry }) }
  if (typeof rawStyle?.backgroundColor === "string") style.backgroundColor = rawStyle.backgroundColor
  delete style.opacity
  if (style.color === "transparent") delete style.color
  if (style.WebkitTextFillColor === "transparent") delete style.WebkitTextFillColor
  if (!includeGeometry) {
    delete style.transform
    delete style.transformOrigin
    style.minWidth = "160px"
    style.minHeight = "48px"
  }
  if (typeof style.width === "string" && Number.parseFloat(style.width) < 48) delete style.width
  if (typeof style.height === "string" && Number.parseFloat(style.height) < 24) delete style.height
  style.display = "inline-flex"
  style.visibility = "visible"
  style.position = "relative"
  style.zIndex = 30
  return style
}

export function AboutSection({ className = "", data }: AboutSectionProps) {
  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const eyebrowRef = useRef<HTMLParagraphElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const textCardRef = useRef<HTMLDivElement>(null)
  const text1Ref = useRef<HTMLParagraphElement>(null)
  const text2Ref = useRef<HTMLParagraphElement>(null)
  const tagsRef = useRef<HTMLParagraphElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isEditing) return

    const registerAll = () => {
      if (sectionRef.current) {
        const existing = getElementById("about-section")
        registerEditable({
          id: "about-section",
          type: "section",
          label: "About Section",
          parentId: null,
          element: sectionRef.current,
          originalRect: sectionRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
        })
      }

      if (bgRef.current) {
        const existing = getElementById("about-bg-image")
        registerEditable({
          id: "about-bg-image",
          type: "image",
          label: "About Background",
          parentId: null,
          element: bgRef.current,
          originalRect: bgRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: bgRef.current.offsetWidth, height: bgRef.current.offsetHeight },
        })
      }

      if (eyebrowRef.current) {
        const existing = getElementById("about-header-eyebrow")
        registerEditable({
          id: "about-header-eyebrow",
          type: "text",
          label: "About Eyebrow",
          parentId: null,
          element: eyebrowRef.current,
          originalRect: eyebrowRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: eyebrowRef.current.offsetWidth, height: eyebrowRef.current.offsetHeight },
        })
      }

      if (headerRef.current) {
        const existing = getElementById("about-header-title")
        registerEditable({
          id: "about-header-title",
          type: "text",
          label: "About Header",
          parentId: null,
          element: headerRef.current,
          originalRect: headerRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: headerRef.current.offsetWidth, height: headerRef.current.offsetHeight },
        })
      }

      if (textCardRef.current) {
        const existing = getElementById("about-text-card")
        registerEditable({
          id: "about-text-card",
          type: "box",
          label: "About Text Card",
          parentId: null,
          element: textCardRef.current,
          originalRect: textCardRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: textCardRef.current.offsetWidth, height: textCardRef.current.offsetHeight },
        })
      }

      if (text1Ref.current) {
        const existing = getElementById("about-text-1")
        registerEditable({
          id: "about-text-1",
          type: "text",
          label: "About Text 1",
          parentId: null,
          element: text1Ref.current,
          originalRect: text1Ref.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: text1Ref.current.offsetWidth, height: text1Ref.current.offsetHeight },
        })
      }

      if (text2Ref.current) {
        const existing = getElementById("about-text-2")
        registerEditable({
          id: "about-text-2",
          type: "text",
          label: "About Text 2",
          parentId: null,
          element: text2Ref.current,
          originalRect: text2Ref.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: text2Ref.current.offsetWidth, height: text2Ref.current.offsetHeight },
        })
      }

      if (tagsRef.current) {
        const existing = getElementById("about-tags")
        registerEditable({
          id: "about-tags",
          type: "text",
          label: "About Tags",
          parentId: null,
          element: tagsRef.current,
          originalRect: tagsRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: tagsRef.current.offsetWidth, height: tagsRef.current.offsetHeight },
        })
      }

      if (copyButtonRef.current) {
        const existing = getElementById("about-copy-button")
        registerEditable({
          id: "about-copy-button",
          type: "button",
          label: "Copy Bio Button",
          parentId: null,
          element: copyButtonRef.current,
          originalRect: copyButtonRef.current.getBoundingClientRect(),
          transform: existing?.transform || { x: 0, y: 0 },
          dimensions: existing?.dimensions || { width: copyButtonRef.current.offsetWidth, height: copyButtonRef.current.offsetHeight },
        })
      }
    }

    registerAll()

    return () => {
      unregisterEditable("about-section")
      unregisterEditable("about-bg-image")
      unregisterEditable("about-header-eyebrow")
      unregisterEditable("about-header-title")
      unregisterEditable("about-text-card")
      unregisterEditable("about-text-1")
      unregisterEditable("about-text-2")
      unregisterEditable("about-tags")
      unregisterEditable("about-copy-button")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const aboutText1 = data.bioParagraphs[0] || ""
  const aboutText2 = data.bioParagraphs[1] || ""
  const aboutCopyLabel = copied ? "✓ Copied to clipboard" : data.copyButtonLabel
  const bioText = [data.eyebrow, data.title, aboutText1, aboutText2, data.bioTagline].filter(Boolean).join("\n\n")

  const copyBio = async () => {
    if (isEditing) return
    try {
      await navigator.clipboard.writeText(bioText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      console.error("Copy failed", error)
    }
  }

  return (
    <section
      ref={sectionRef}
      data-editor-node-id="about-section"
      data-editor-node-type="section"
      data-editor-node-label="About Section"
      className={`relative isolate min-h-screen w-full overflow-hidden bg-black ${className}`}
      style={getAboutSectionStyle(data.elementStyles)}
    >
      <div
        ref={bgRef}
        data-editor-node-id="about-bg-image"
        data-editor-node-type="background"
        data-editor-media-kind="image"
        data-editor-node-label="About Background"
        className="absolute inset-0 z-0"
        style={getElementLayoutStyle(data.elementStyles, "about-bg-image")}
      >
        <Image
          src={data.backgroundImageUrl}
          alt="Band members background"
          fill
          className="object-cover"
          style={{ objectPosition: "center top" }}
        />
      </div>

      <div className="section-photo-scrim z-10" />
      <div className="section-photo-fade-top z-10" />
      <div className="section-photo-fade-bottom z-10" />

      <div className="relative z-20 flex min-h-screen min-h-[100dvh] items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="relative z-20 mb-10 max-w-4xl md:mb-12">
            <p
              ref={eyebrowRef}
              data-editor-node-id="about-header-eyebrow"
              data-editor-node-type="text"
              data-editor-node-label="About Eyebrow"
              className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#FF8C21] md:text-base"
              style={getElementLayoutStyle(data.elementStyles, "about-header-eyebrow")}
            >
              {data.eyebrow}
            </p>
            <h2
              ref={headerRef}
              data-editor-node-id="about-header-title"
              data-editor-node-type="text"
              data-editor-node-label="About Header"
              className="text-4xl font-black leading-[0.95] text-white md:text-6xl lg:text-7xl"
              style={getElementLayoutStyle(data.elementStyles, "about-header-title")}
            >
              {data.title}
            </h2>
          </div>

          <div
            ref={textCardRef}
            data-editor-node-id="about-text-card"
            data-editor-node-type="card"
            data-editor-node-label="About Text Card"
            className="relative z-10 w-full rounded-3xl border border-white/10 bg-black/50 px-6 py-8 shadow-2xl backdrop-blur-md md:px-10 md:py-12 lg:px-12 lg:py-14"
            style={getAboutBoxStyle(data.elementStyles, "about-text-card")}
          >
            <div className="space-y-6 text-white md:space-y-8">
              <p
                ref={text1Ref}
                data-editor-node-id="about-text-1"
                data-editor-node-type="text"
                data-editor-node-label="About Text 1"
                className="mb-0 max-w-none text-base leading-relaxed text-white/95 md:text-lg"
                style={getElementLayoutStyle(data.elementStyles, "about-text-1")}
              >
                {aboutText1}
              </p>
              <p
                ref={text2Ref}
                data-editor-node-id="about-text-2"
                data-editor-node-type="text"
                data-editor-node-label="About Text 2"
                className="mb-0 max-w-none text-base leading-relaxed text-white/90 md:text-lg"
                style={getElementLayoutStyle(data.elementStyles, "about-text-2")}
              >
                {aboutText2}
              </p>
              <p
                ref={tagsRef}
                data-editor-node-id="about-tags"
                data-editor-node-type="text"
                data-editor-node-label="About Tags"
                className="mb-0 max-w-none pt-2 text-sm leading-relaxed text-[#FF8C21] md:text-base"
                style={getElementLayoutStyle(data.elementStyles, "about-tags")}
              >
                {data.bioTagline}
              </p>
            </div>
          </div>

          <div className="relative z-30 mt-12 flex justify-center">
            <button
              ref={copyButtonRef}
              type="button"
              onClick={copyBio}
              data-editor-node-id="about-copy-button"
              data-editor-node-type="button"
              data-editor-node-label="Copy Bio Button"
              className="inline-flex items-center justify-center rounded-2xl border border-[#FF8C21]/70 bg-[#FF8C21]/90 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#FF8C21]/30 md:text-lg"
              style={getAboutCopyButtonStyle(data.elementStyles)}
            >
              {aboutCopyLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
