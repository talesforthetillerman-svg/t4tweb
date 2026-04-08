"use client"

import { motion } from "framer-motion"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { useCampaignUrgency } from "@/hooks/use-campaign-urgency"

export function LatestReleaseSection() {
  const urgencyCue = useCampaignUrgency(CAMPAIGN_CONTENT.urgencyCue)

  return (
    <section id="latest-release" data-campaign-touchpoint="latest-release" className="relative py-14 md:py-16 bg-black/55">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-primary/35 bg-card/70 backdrop-blur-sm p-6 md:p-10"
        >
          <p className="text-primary text-xs md:text-sm font-semibold uppercase tracking-[0.2em] mb-3">
            {CAMPAIGN_CONTENT.tag}
          </p>
          <h2 className="font-serif text-3xl md:text-5xl text-foreground mb-2">
            {CAMPAIGN_CONTENT.releaseTitle}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg mb-2">
            {CAMPAIGN_CONTENT.releaseSubtitle}
          </p>
          <p aria-live="polite" className="text-primary/90 text-sm mb-6">
            {urgencyCue}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={CAMPAIGN_CONTENT.releaseCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-6 py-3 rounded-lg font-semibold text-center ${CAMPAIGN_PRIMARY_CTA_CLASS}`}
            >
              {CAMPAIGN_CONTENT.releaseCtaLabel}
            </a>
            <a
              href={CAMPAIGN_CONTENT.showsCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold text-center border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
            >
              {CAMPAIGN_CONTENT.showsCtaLabel}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
