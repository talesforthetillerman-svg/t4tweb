"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { useCampaignUrgency } from "@/hooks/use-campaign-urgency"
import { SectionHeader } from "@/components/section-header"

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { opacity, y } = useScrollAnimation(sectionRef)
  const urgencyCue = useCampaignUrgency(CAMPAIGN_CONTENT.urgencyCue)

  const contactMethods = [
    {
      title: "Email Us",
      description: "For booking inquiries Momo Garcia - Band Management",
      icon: EmailIcon,
      href: "mailto:talesforthetillerman@gmail.com",
      label: "talesforthetillerman@gmail.com",
      internal: true,
    },
    {
      title: "Telegram",
      description: "Janosch Puhe - Quick response for urgent matters",
      icon: TelegramIcon,
      href: "https://t.me/Janoschpuhe",
      label: "@Janoschpuhe +4916090615287",
      internal: false,
    },
  ]

  return (
    <section
      ref={sectionRef}
      data-campaign-touchpoint="contact-booking"
      className="relative overflow-hidden py-14 md:py-16"
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/sections/contact-bg.jpg"
          alt="Contact section background"
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>
      <div className="section-photo-scrim" />
      <div className="section-photo-fade-top" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div style={{ opacity, y }} className="mb-10 md:mb-12">
          <SectionHeader
            eyebrow={CAMPAIGN_CONTENT.tag}
            title={CAMPAIGN_CONTENT.primaryCtaLabel}
            description={CAMPAIGN_CONTENT.description}
            footer={
              <p className="inline-flex items-center rounded-full border border-primary/35 bg-primary/12 px-4 py-2 text-[length:var(--text-small)] text-primary">
                {urgencyCue}
              </p>
            }
          />
        </motion.div>

        {/* Contact Options */}
        <div className="grid sm:grid-cols-2 gap-6 mb-0">
          {contactMethods.map((method, index) => (
            <motion.a
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ duration: 0.45, delay: 0.06 + index * 0.06, type: "spring", stiffness: 320, damping: 22 }}
              href={method.href}
              target={method.internal ? undefined : "_blank"}
              rel={method.internal ? undefined : "noopener noreferrer"}
              className="group rounded-2xl border border-border bg-card/90 p-8 text-center shadow-md backdrop-blur-sm transition-all duration-300 hover:border-primary/45 hover:shadow-lg md:p-10"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/18 group-hover:bg-primary/26 md:mb-6 md:h-20 md:w-20">
                <method.icon className="h-9 w-9 text-primary md:h-10 md:w-10" />
              </div>
              <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
                {method.title}
              </h3>
              <p className="text-muted-foreground text-lg mb-5">
                {method.description}
              </p>
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-lg ${CAMPAIGN_PRIMARY_CTA_CLASS}`}>
                {method.label}
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
            </motion.a>
          ))}
        </div>
      </div>

      <div className="section-photo-fade-bottom" />
    </section>
  )
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "w-6 h-6"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "w-6 h-6"}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}
