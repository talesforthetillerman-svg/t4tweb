"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"

export function FloatingBookingBar() {
  const [dismissed, setDismissed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const isDismissed = window.sessionStorage.getItem("floating-booking-dismissed")
    if (isDismissed === "true") {
      setDismissed(true)
    }
    setReady(true)
  }, [])

  function dismissBar() {
    setDismissed(true)
    window.sessionStorage.setItem("floating-booking-dismissed", "true")
  }

  if (!ready || dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 rounded-2xl border border-primary/30 bg-black/80 p-3 backdrop-blur-md"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex-1">
          <p className="text-primary text-[11px] uppercase tracking-[0.16em] font-semibold">
            {CAMPAIGN_CONTENT.tag}
          </p>
          <p className="text-foreground text-sm md:text-base">
            {CAMPAIGN_CONTENT.urgencyCue}
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
          className="inline-flex items-center justify-center rounded-lg border border-primary/40 px-3 py-2 text-xs text-primary hover:bg-primary/10 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}
