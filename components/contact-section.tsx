"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { CAMPAIGN_CONTENT, CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { useCampaignUrgency } from "@/hooks/use-campaign-urgency"

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
    <section id="contact" data-campaign-touchpoint="contact-booking" ref={sectionRef} className="relative py-16 md:py-20 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/sections/contact-bg.jpg"
          alt="Contact section background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        {/* Header */}
        <motion.div
          style={{ opacity, y }}
          className="text-center mb-8"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block"
          >
            {CAMPAIGN_CONTENT.tag}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 text-balance"
          >
            {CAMPAIGN_CONTENT.primaryCtaLabel}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg"
          >
            {CAMPAIGN_CONTENT.description}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            aria-live="polite"
            className="mx-auto mt-4 inline-flex items-center rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-sm text-primary"
          >
            {urgencyCue}
          </motion.p>
        </motion.div>

        {/* Contact Options */}
        <div className="grid sm:grid-cols-2 gap-6 mb-0">
          {contactMethods.map((method, index) => (
            <motion.a
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1, type: "spring", stiffness: 300, damping: 20 }}
              href={method.href}
              target={method.internal ? undefined : "_blank"}
              rel={method.internal ? undefined : "noopener noreferrer"}
              className="group p-10 bg-card/90 backdrop-blur-sm rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 text-center shadow-lg hover:shadow-xl"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <method.icon className="w-10 h-10 text-primary" />
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
