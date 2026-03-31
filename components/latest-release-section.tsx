"use client"

import { motion } from "framer-motion"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"

export function LatestReleaseSection() {
  return (
    <section
      id="latest-release"
      className="relative overflow-hidden bg-black py-0"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/images/sections/hero-bg.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-40 md:hidden"
        />
        <iframe
          src="https://www.youtube.com/embed/xofflmVqYGs?autoplay=1&mute=1&loop=1&playlist=xofflmVqYGs&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
          title=""
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-40 hidden md:block"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
        />

        <div className="absolute inset-0 bg-black/48" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/82 to-transparent md:h-56 lg:h-64" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/82 to-transparent md:h-56 lg:h-64" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/28 via-transparent to-black/20" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45 }}
            className="flex w-full max-w-4xl flex-col items-center rounded-2xl border border-primary/28 bg-black/24 p-6 text-center shadow-md backdrop-blur-sm md:p-8"
          >
            <h2 className="mb-[var(--spacing-sm)] w-full text-center font-serif text-[length:var(--text-h2)] leading-[var(--line-height-tight)] text-foreground">
              {CAMPAIGN_CONTENT.releaseTitle}
            </h2>

            <p className="mb-6 w-full text-center text-[length:var(--text-body)] text-muted-foreground">
              {CAMPAIGN_CONTENT.releaseSubtitle}
            </p>

            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="https://www.youtube.com/watch?v=xofflmVqYGs"
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-xl px-6 py-3 text-center text-base font-semibold shadow-md min-h-[48px] ${CAMPAIGN_PRIMARY_CTA_CLASS}`}
              >
                {CAMPAIGN_CONTENT.releaseCtaLabel}
              </a>
              <a
                href={CAMPAIGN_CONTENT.showsCtaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-primary/35 px-6 py-3 text-center text-base font-semibold text-primary transition-colors hover:bg-primary/10 min-h-[48px]"
              >
                {CAMPAIGN_CONTENT.showsCtaLabel}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}