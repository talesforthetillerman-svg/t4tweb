"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { useCampaignUrgency } from "@/hooks/use-campaign-urgency"

const isBrowser = typeof window !== "undefined"

export function FloatingBookingBar() {
  const [dismissed, setDismissed] = useState(() => {
    if (isBrowser) {
      return window.sessionStorage.getItem("floating-booking-dismissed") === "true"
    }
    return false
  })
  const urgencyCue = useCampaignUrgency(CAMPAIGN_CONTENT.urgencyCue)

  function dismissBar() {
    setDismissed(true)
    window.sessionStorage.setItem("floating-booking-dismissed", "true")
  }

  if (!isBrowser || dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      data-campaign-touchpoint="floating-booking"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 rounded-2xl border border-primary/30 bg-black/80 p-3 backdrop-blur-md"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex-1">
          <p className="text-primary text-[11px] uppercase tracking-[0.16em] font-semibold">
            {CAMPAIGN_CONTENT.tag}
          </p>
          <p className="text-foreground text-sm md:text-base">
            {urgencyCue}
          </p>
        </div>
        <a
          href={CAMPAIGN_CONTENT.primaryCtaHref}
          className={`inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold ${CAMPAIGN_PRIMARY_CTA_CLASS}`}
        >
          {CAMPAIGN_CONTENT.primaryCtaLabel}
        </a>
        <button
          type="button"
          onClick={dismissBar}
          aria-label="Dismiss booking bar"
          className="hidden md:inline-flex items-center justify-center rounded-lg border border-primary/40 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors min-h-[44px]"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}
