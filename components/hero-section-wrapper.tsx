"use client"

import { HeroSection } from "@/components/hero-section"
import type { HeroData } from "@/lib/sanity/hero-loader"
import { useVisualEditor } from "@/components/visual-editor"
import { useMemo } from "react"

export function HeroSectionWrapper({ data, isEditorRoute = false }: { data: HeroData; isEditorRoute?: boolean }) {
  const { isEditing, nodes } = useVisualEditor()

  // When in editor (either via isEditing context or isEditorRoute prop), merge visual-editor node data over loader data
  // isEditorRoute is used during SSR when context doesn't exist yet
  const effectiveData: HeroData = useMemo(() => {
    const shouldMerge = (isEditing || isEditorRoute) && nodes.size
    if (!shouldMerge) return data

    const heroTitle = nodes.get("hero-title")
    const heroSubtitle = nodes.get("hero-subtitle")

    const merged: HeroData = { ...data }

    if (heroTitle?.content?.text) {
      merged.title = heroTitle.content.text as string
    }
    if (heroSubtitle?.content?.text) {
      merged.subtitle = heroSubtitle.content.text as string
    }

    return merged
  }, [isEditing, isEditorRoute, nodes, data])

  return <HeroSection data={effectiveData} />
}
