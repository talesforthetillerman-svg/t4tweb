"use client"

import { HeroSection } from "@/components/hero-section"
import type { HeroData } from "@/lib/sanity/hero-loader"
import { useVisualEditor } from "@/components/visual-editor"
import { useMemo } from "react"

export function HeroSectionWrapper({ data, isEditorRoute = false }: { data: HeroData; isEditorRoute?: boolean }) {
  // CRITICAL CHANGE: Do NOT merge visual-editor nodes into Sanity data
  //
  // Why: Merging causes old sessionStorage nodes to overwrite fresh Sanity data
  // When user returns to /editor, nodes Map contains old data, and we'd merge that old text
  // into the fresh Sanity-provided data, making old content appear
  //
  // Solution: Render from Sanity data ONLY
  // visual-editor overlays handle live edits, not text substitution
  // Text edits go through panel → deploy → Sanity → next load shows it

  return <HeroSection data={data} />
}
