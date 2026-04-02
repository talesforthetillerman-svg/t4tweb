"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { SectionHeader } from "@/components/section-header"

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { opacity, y } = useScrollAnimation(sectionRef)

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
      data-edit-id="contact-section"
      data-edit-type="section"
      data-edit-label="Sección de Contacto"
      className="relative min-h-screen overflow-hidden"
    >
      <div 
        data-edit-id="contact-bg-image"
        data-edit-type="image"
        data-edit-label="Imagen de fondo contacto"
        className="absolute inset-0 -z-10"
      >
        <Image
          src="/images/sections/contact-bg.jpg"
          alt="Contact section background"
          fill
          className="object-cover"
          sizes="100vw"
          style={{ objectPosition: "center center" }}
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-black/20" />
      <div className="section-photo-fade-top" />
      <div className="section-photo-fade-bottom" />

      <div className="relative z-10 mx-auto w-full max-w-5xl min-h-screen flex flex-col justify-end">
        <motion.div style={{ opacity, y }} className="mb-10 md:mb-12">
          <SectionHeader
            eyebrow="Contact"
            title="Book the Band"
            description="Get in touch for booking inquiries and event collaborations."
            data-edit-id="contact-header"
            data-edit-type="text"
            data-edit-label="Encabezado Contacto"
          />
        </motion.div>

        {/* Contact Options */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
          <motion.a
            data-edit-id="contact-email"
            data-edit-type="link"
            data-edit-label="Contacto Email"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            whileHover={{ y: -2, scale: 1.01 }}
            transition={{ duration: 0.45, type: "spring", stiffness: 320, damping: 22 }}
            href={contactMethods[0].href}
            className="group rounded-xl border border-border bg-card/90 p-4 md:p-5 lg:p-7 text-center shadow-md backdrop-blur-sm transition-all duration-300 hover:border-primary/45 hover:shadow-lg flex-1 max-w-xs"
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/18 group-hover:bg-primary/26 md:mb-4 md:h-14 md:w-14">
              <EmailIcon className="h-6 w-6 text-primary md:h-7 md:w-7" />
            </div>
            <h3 
              data-edit-id="contact-email-title"
              data-edit-type="text"
              data-edit-label="Título Email"
              className="font-serif text-lg md:text-xl text-foreground mb-2"
            >
              Email Us
            </h3>
            <p 
              data-edit-id="contact-email-description"
              data-edit-type="text"
              data-edit-label="Descripción Email"
              className="text-muted-foreground text-sm md:text-base mb-3 md:mb-4"
            >
              Momo Garcia - Management
            </p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs md:text-sm max-w-full ${CAMPAIGN_PRIMARY_CTA_CLASS}`}>
              <span 
                data-edit-id="contact-email-address"
                data-edit-type="text"
                data-edit-label="Dirección Email"
                className="truncate"
              >
                talesforthetillerman@gmail.com
              </span>
            </span>
          </motion.a>

          <div className="text-center px-4">
            <p className="text-muted-foreground text-sm md:text-base">
              Choose your preferred<br />
              way to reach us
            </p>
          </div>

          <motion.a
            data-edit-id="contact-telegram"
            data-edit-type="link"
            data-edit-label="Contacto Telegram"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            whileHover={{ y: -2, scale: 1.01 }}
            transition={{ duration: 0.45, type: "spring", stiffness: 320, damping: 22 }}
            href={contactMethods[1].href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border bg-card/90 p-4 md:p-5 lg:p-7 text-center shadow-md backdrop-blur-sm transition-all duration-300 hover:border-primary/45 hover:shadow-lg flex-1 max-w-xs"
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/18 group-hover:bg-primary/26 md:mb-4 md:h-14 md:w-14">
              <TelegramIcon className="h-6 w-6 text-primary md:h-7 md:w-7" />
            </div>
            <h3 
              data-edit-id="contact-telegram-title"
              data-edit-type="text"
              data-edit-label="Título Telegram"
              className="font-serif text-lg md:text-xl text-foreground mb-2"
            >
              Telegram
            </h3>
            <p 
              data-edit-id="contact-telegram-description"
              data-edit-type="text"
              data-edit-label="Descripción Telegram"
              className="text-muted-foreground text-sm md:text-base mb-3 md:mb-4"
            >
              Janosch Puhe - Quick response
            </p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs md:text-sm max-w-full ${CAMPAIGN_PRIMARY_CTA_CLASS}`}>
              <span 
                data-edit-id="contact-telegram-handle"
                data-edit-type="text"
                data-edit-label="Handle Telegram"
                className="truncate"
              >
                @Janoschpuhe
              </span>
            </span>
          </motion.a>
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
