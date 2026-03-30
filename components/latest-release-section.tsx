"use client"

import { motion } from "framer-motion"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { useCampaignUrgency } from "@/hooks/use-campaign-urgency"

export function LatestReleaseSection() {
  const urgencyCue = useCampaignUrgency(CAMPAIGN_CONTENT.urgencyCue)

  return (
    <section
      id="latest-release"
      data-campaign-touchpoint="latest-release"
      className="relative bg-black/50 py-12 md:py-14"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-primary/30 bg-card/65 p-6 shadow-md backdrop-blur-sm md:p-8"
        >
          <p className="mb-[var(--spacing-sm)] text-[length:var(--text-small)] font-semibold uppercase tracking-[0.18em] text-primary">
            {CAMPAIGN_CONTENT.tag}
          </p>
          <div className="mb-[var(--spacing-md)] flex flex-wrap gap-2">
            <a
              href={CAMPAIGN_CONTENT.liveStatusHref}
              className="inline-flex items-center rounded-full border border-primary/28 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/18"
            >
              {CAMPAIGN_CONTENT.liveStatusBadge}
            </a>
            <a
              href={CAMPAIGN_CONTENT.nextShowHref}
              className="inline-flex items-center rounded-full border border-border bg-secondary/55 px-3 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              {CAMPAIGN_CONTENT.nextShowBadge}
            </a>
          </div>
          <h2 className="mb-[var(--spacing-sm)] font-serif text-[length:var(--text-h2)] leading-[var(--line-height-tight)] text-foreground">
            {CAMPAIGN_CONTENT.releaseTitle}
          </h2>
          <p className="mb-1 text-[length:var(--text-body)] text-muted-foreground">
            {CAMPAIGN_CONTENT.releaseSubtitle}
          </p>
          <p className="mb-[var(--spacing-md)] text-[length:var(--text-small)] text-primary/90">{urgencyCue}</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={CAMPAIGN_CONTENT.releaseCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-xl px-6 py-3 text-center text-base font-semibold shadow-md ${CAMPAIGN_PRIMARY_CTA_CLASS}`}
            >
              {CAMPAIGN_CONTENT.releaseCtaLabel}
            </a>
            <a
              href={CAMPAIGN_CONTENT.showsCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-primary/35 px-6 py-3 text-center text-base font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              {CAMPAIGN_CONTENT.showsCtaLabel}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
