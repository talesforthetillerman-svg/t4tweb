"use client"

import { HeroSection } from "@/components/hero-section"
import type { HeroData } from "@/lib/sanity/hero-loader"
import { useVisualEditor } from "@/components/visual-editor"
import { useMemo } from "react"

export function HeroSectionWrapper({ data }: { data: HeroData }) {
  const { isEditing, nodes } = useVisualEditor()

  // When editing, merge visual-editor node data over loader data
  const effectiveData: HeroData = useMemo(() => {
    if (!isEditing || !nodes.size) return data

    const heroTitle = nodes.get("hero-title")
    const heroSubtitle = nodes.get("hero-subtitle")

    const merged: HeroData = { ...data }

    if (heroTitle?.content?.text) {
      merged.title = heroTitle.content.text as string
    }
    if (heroTitle?.content?.accentText) {
      merged.titleHighlight = heroTitle.content.accentText as string
    }
    if (heroSubtitle?.content?.text) {
      merged.subtitle = heroSubtitle.content.text as string
    }

    return merged
  }, [isEditing, nodes, data])

  return <HeroSection data={effectiveData} />
}
