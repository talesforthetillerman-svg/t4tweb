"use client"

import { HeroSection } from "@/components/hero-section"
import type { HeroData } from "@/lib/sanity/hero-loader"

export function HeroSectionWrapper({ data }: { data: HeroData }) {
  return <HeroSection data={data} />
}
