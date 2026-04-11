"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { CAMPAIGN_PRIMARY_CTA_CLASS } from "@/components/campaign-content"
import { SectionHeader } from "@/components/section-header"
import { useVisualEditor } from "@/components/visual-editor"
import { useDesktopLayoutOverridesEnabled } from "@/hooks/use-desktop-layout-overrides"
import type { CSSProperties } from "react"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

interface ContactSectionProps {
  overrides?: Record<string, HomeEditorNodeOverride>
}

function buildInlineStyleFromOverride(
  override: HomeEditorNodeOverride | undefined,
  includeGeometry: boolean
): CSSProperties | undefined {
  if (!override) return undefined
  const style: CSSProperties = {}
  const scale = typeof override.style.scale === "number" ? Math.max(0.1, override.style.scale) : 1
  if (includeGeometry && (override.explicitPosition || (override.explicitStyle && scale !== 1))) {
    style.transform =
      scale !== 1
        ? `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px) scale(${scale})`
        : `translate(${Math.round(override.geometry.x)}px, ${Math.round(override.geometry.y)}px)`
    style.transformOrigin = "top left"
  }
  if (includeGeometry && override.explicitSize) {
    style.width = `${Math.max(8, Math.round(override.geometry.width))}px`
    style.height = `${Math.max(8, Math.round(override.geometry.height))}px`
  }
  if (override.explicitStyle) {
    if (override.style.opacity !== undefined) style.opacity = override.style.opacity
    if (override.style.backgroundColor) style.backgroundColor = override.style.backgroundColor
    if (override.style.color) style.color = override.style.color
    if (override.style.fontSize) style.fontSize = override.style.fontSize
    if (override.style.fontFamily) style.fontFamily = override.style.fontFamily
    if (override.style.fontWeight) style.fontWeight = override.style.fontWeight as CSSProperties["fontWeight"]
    if (override.style.fontStyle) style.fontStyle = override.style.fontStyle as CSSProperties["fontStyle"]
    if (override.style.textDecoration) style.textDecoration = override.style.textDecoration as CSSProperties["textDecoration"]
    if (override.style.minHeight) style.minHeight = override.style.minHeight
    if (override.style.paddingTop) style.paddingTop = override.style.paddingTop
    if (override.style.paddingBottom) style.paddingBottom = override.style.paddingBottom
  }
  return Object.keys(style).length > 0 ? style : undefined
}

function resolveTextOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const text = override.content.text?.trim()
  return text ? text : fallback
}

function resolveHrefOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const href = override.content.href?.trim()
  return href ? href : fallback
}

function resolveImageSrcOverride(override: HomeEditorNodeOverride | undefined, fallback: string): string {
  if (!override?.explicitContent) return fallback
  const src = override.content.src?.trim()
  return src ? src : fallback
}

export function ContactSection({ overrides = {} }: ContactSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const emailCardRef = useRef<HTMLAnchorElement>(null)
  const emailTitleRef = useRef<HTMLHeadingElement>(null)
  const emailDescRef = useRef<HTMLParagraphElement>(null)
  const emailAddrRef = useRef<HTMLSpanElement>(null)
  const telegramCardRef = useRef<HTMLAnchorElement>(null)
  const telegramTitleRef = useRef<HTMLHeadingElement>(null)
  const telegramDescRef = useRef<HTMLParagraphElement>(null)
  const telegramHandleRef = useRef<HTMLSpanElement>(null)
  const middleTextRef = useRef<HTMLParagraphElement>(null)
  const { opacity, y } = useScrollAnimation(sectionRef)
  const { isEditing, registerEditable, unregisterEditable, getElementById } = useVisualEditor()
  const allowGeometryOverrides = useDesktopLayoutOverridesEnabled(isEditing)
  const sectionOverride = overrides["contact-section"]
  const bgOverride = overrides["contact-bg-image"]
  // SectionHeader creates data-editor-node-id="contact-header-title" (with -title suffix),
  // so the editor stores overrides under "contact-header-title", not "contact-header".
  const headerOverride = overrides["contact-header-title"]
  const emailCardOverride = overrides["contact-email"]
  const emailTitleOverride = overrides["contact-email-title"]
  const emailDescriptionOverride = overrides["contact-email-description"]
  const emailAddressOverride = overrides["contact-email-address"]
  const telegramCardOverride = overrides["contact-telegram"]
  const telegramTitleOverride = overrides["contact-telegram-title"]
  const telegramDescriptionOverride = overrides["contact-telegram-description"]
  const telegramHandleOverride = overrides["contact-telegram-handle"]
  const middleTextOverride = overrides["contact-middle-text"]

  useEffect(() => {
    if (!isEditing) return

    if (sectionRef.current) {
      const existing = getElementById('contact-section')
      registerEditable({
        id: 'contact-section',
        type: 'section',
        label: 'Contact Section',
        parentId: null,
        element: sectionRef.current,
        originalRect: sectionRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: sectionRef.current.offsetWidth, height: sectionRef.current.offsetHeight },
      })
    }

    if (bgRef.current) {
      const existing = getElementById('contact-bg-image')
      registerEditable({
        id: 'contact-bg-image',
        type: 'image',
        label: 'Contact Background',
        parentId: null,
        element: bgRef.current,
        originalRect: bgRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: bgRef.current.offsetWidth, height: bgRef.current.offsetHeight },
      })
    }

    if (emailCardRef.current) {
      const existing = getElementById('contact-email')
      registerEditable({
        id: 'contact-email',
        type: 'link',
        label: 'Contact Email',
        parentId: null,
        element: emailCardRef.current,
        originalRect: emailCardRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: emailCardRef.current.offsetWidth, height: emailCardRef.current.offsetHeight },
      })
    }

    if (emailTitleRef.current) {
      const existing = getElementById('contact-email-title')
      registerEditable({
        id: 'contact-email-title',
        type: 'text',
        label: 'Email Title',
        parentId: null,
        element: emailTitleRef.current,
        originalRect: emailTitleRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: emailTitleRef.current.offsetWidth, height: emailTitleRef.current.offsetHeight },
      })
    }

    if (emailDescRef.current) {
      const existing = getElementById('contact-email-description')
      registerEditable({
        id: 'contact-email-description',
        type: 'text',
        label: 'Email Description',
        parentId: null,
        element: emailDescRef.current,
        originalRect: emailDescRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: emailDescRef.current.offsetWidth, height: emailDescRef.current.offsetHeight },
      })
    }

    if (emailAddrRef.current) {
      const existing = getElementById('contact-email-address')
      registerEditable({
        id: 'contact-email-address',
        type: 'text',
        label: 'Email Address',
        parentId: null,
        element: emailAddrRef.current,
        originalRect: emailAddrRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: emailAddrRef.current.offsetWidth, height: emailAddrRef.current.offsetHeight },
      })
    }

    if (telegramCardRef.current) {
      const existing = getElementById('contact-telegram')
      registerEditable({
        id: 'contact-telegram',
        type: 'link',
        label: 'Contact Telegram',
        parentId: null,
        element: telegramCardRef.current,
        originalRect: telegramCardRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: telegramCardRef.current.offsetWidth, height: telegramCardRef.current.offsetHeight },
      })
    }

    if (telegramTitleRef.current) {
      const existing = getElementById('contact-telegram-title')
      registerEditable({
        id: 'contact-telegram-title',
        type: 'text',
        label: 'Telegram Title',
        parentId: null,
        element: telegramTitleRef.current,
        originalRect: telegramTitleRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: telegramTitleRef.current.offsetWidth, height: telegramTitleRef.current.offsetHeight },
      })
    }

    if (telegramDescRef.current) {
      const existing = getElementById('contact-telegram-description')
      registerEditable({
        id: 'contact-telegram-description',
        type: 'text',
        label: 'Telegram Description',
        parentId: null,
        element: telegramDescRef.current,
        originalRect: telegramDescRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: telegramDescRef.current.offsetWidth, height: telegramDescRef.current.offsetHeight },
      })
    }

    if (telegramHandleRef.current) {
      const existing = getElementById('contact-telegram-handle')
      registerEditable({
        id: 'contact-telegram-handle',
        type: 'text',
        label: 'Telegram Handle',
        parentId: null,
        element: telegramHandleRef.current,
        originalRect: telegramHandleRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: telegramHandleRef.current.offsetWidth, height: telegramHandleRef.current.offsetHeight },
      })
    }

    if (middleTextRef.current) {
      const existing = getElementById('contact-middle-text')
      registerEditable({
        id: 'contact-middle-text',
        type: 'text',
        label: 'Contact Middle Text',
        parentId: null,
        element: middleTextRef.current,
        originalRect: middleTextRef.current.getBoundingClientRect(),
        transform: existing?.transform || { x: 0, y: 0 },
        dimensions: existing?.dimensions || { width: middleTextRef.current.offsetWidth, height: middleTextRef.current.offsetHeight },
      })
    }

    return () => {
      unregisterEditable('contact-section')
      unregisterEditable('contact-bg-image')
      unregisterEditable('contact-email')
      unregisterEditable('contact-email-title')
      unregisterEditable('contact-email-description')
      unregisterEditable('contact-email-address')
      unregisterEditable('contact-telegram')
      unregisterEditable('contact-telegram-title')
      unregisterEditable('contact-telegram-description')
      unregisterEditable('contact-telegram-handle')
      unregisterEditable('contact-middle-text')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

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
  const contactBgSrc = resolveImageSrcOverride(bgOverride, "/images/sections/contact-bg.jpg")
  const contactHeaderTitle = resolveTextOverride(headerOverride, "Book the Band")
  const emailTitle = resolveTextOverride(emailTitleOverride, "Email Us")
  const emailDescription = resolveTextOverride(emailDescriptionOverride, "Momo Garcia - Management")
  const emailAddress = resolveTextOverride(emailAddressOverride, "talesforthetillerman@gmail.com")
  const emailHref = resolveHrefOverride(emailCardOverride, contactMethods[0].href)
  const telegramTitle = resolveTextOverride(telegramTitleOverride, "Telegram")
  const telegramDescription = resolveTextOverride(telegramDescriptionOverride, "Janosch Puhe - Quick response")
  const telegramHandle = resolveTextOverride(telegramHandleOverride, "@Janoschpuhe")
  const telegramHref = resolveHrefOverride(telegramCardOverride, contactMethods[1].href)
  const middleText = resolveTextOverride(middleTextOverride, "Choose your preferred\nway to reach us")

  return (
    <section
      ref={sectionRef}
      data-campaign-touchpoint="contact-booking"
      data-editor-node-id="contact-section"
      data-editor-node-type="section"
      data-editor-node-label="Sección de Contacto"
      className="relative min-h-[82vh] min-h-[82dvh] overflow-hidden sm:min-h-screen sm:min-h-[100dvh]"
      style={buildInlineStyleFromOverride(sectionOverride, allowGeometryOverrides)}
    >
      <div 
        ref={bgRef}
        data-editor-node-id="contact-bg-image"
        data-editor-node-type="background"
        data-editor-media-kind="image"
        data-editor-node-label="Imagen de fondo contacto"
        className="absolute inset-0 -z-10"
        style={buildInlineStyleFromOverride(bgOverride, allowGeometryOverrides)}
      >
        <Image
          src={contactBgSrc}
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
        <motion.div ref={headerRef} style={isEditing ? undefined : { opacity, y }} className="mb-10 md:mb-12">
          <div style={buildInlineStyleFromOverride(headerOverride, allowGeometryOverrides)}>
          <SectionHeader
            eyebrow="Contact"
            title={contactHeaderTitle}
            description="Get in touch for booking inquiries and event collaborations."
            dataEditId="contact-header"
            dataEditType="text"
            dataEditLabel="Encabezado Contacto"
          />
          </div>
        </motion.div>

        {/* Contact Options */}
        <div className="flex flex-col items-stretch justify-center gap-4 md:flex-row md:items-center md:gap-8">
          <motion.a
            ref={emailCardRef}
            data-editor-node-id="contact-email"
            data-editor-node-type="card"
            data-editor-node-label="Contacto Email"
            data-editor-grouped="true"
            initial={isEditing ? false : { opacity: 0, x: -20 }}
            whileInView={isEditing ? undefined : { opacity: 1, x: 0 }}
            whileHover={isEditing ? undefined : { y: -2, scale: 1.01 }}
            transition={isEditing ? undefined : { duration: 0.45, type: "spring", stiffness: 320, damping: 22 }}
            href={emailHref}
            className={`group rounded-xl border border-border bg-card/90 p-4 md:p-5 lg:p-7 text-center shadow-md backdrop-blur-sm flex-1 max-w-xs ${
              isEditing ? "" : "transition-all duration-300 hover:border-primary/45 hover:shadow-lg"
            }`}
            style={buildInlineStyleFromOverride(emailCardOverride, allowGeometryOverrides)}
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/18 group-hover:bg-primary/26 md:mb-4 md:h-14 md:w-14">
              <EmailIcon className="h-6 w-6 text-primary md:h-7 md:w-7" />
            </div>
            <h3 
              ref={emailTitleRef}
              data-editor-node-id="contact-email-title"
              data-editor-node-type="text"
              data-editor-node-label="Título Email"
              className="mb-2 font-serif text-base text-foreground md:text-xl"
              style={buildInlineStyleFromOverride(emailTitleOverride, allowGeometryOverrides)}
            >
              {emailTitle}
            </h3>
            <p 
              ref={emailDescRef}
              data-editor-node-id="contact-email-description"
              data-editor-node-type="text"
              data-editor-node-label="Descripción Email"
              className="mb-3 text-sm text-muted-foreground md:mb-4 md:text-base"
              style={buildInlineStyleFromOverride(emailDescriptionOverride, allowGeometryOverrides)}
            >
              {emailDescription}
            </p>
            <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium md:text-sm ${CAMPAIGN_PRIMARY_CTA_CLASS}`}>
              <span 
                ref={emailAddrRef}
                data-editor-node-id="contact-email-address"
                data-editor-node-type="text"
                data-editor-node-label="Dirección Email"
                className="truncate"
                style={buildInlineStyleFromOverride(emailAddressOverride, allowGeometryOverrides)}
              >
                {emailAddress}
              </span>
            </span>
          </motion.a>

          <div className="px-4 text-center">
            <p
              ref={middleTextRef}
              data-editor-node-id="contact-middle-text"
              data-editor-node-type="text"
              data-editor-node-label="Contact Middle Text"
              className="text-xs text-muted-foreground md:text-base"
              style={buildInlineStyleFromOverride(middleTextOverride, allowGeometryOverrides)}
            >
              {middleText.split("\n").map((line, index) => (
                <span key={`${line}-${index}`}>
                  {line}
                  {index < middleText.split("\n").length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          </div>

          <motion.a
            ref={telegramCardRef}
            data-editor-node-id="contact-telegram"
            data-editor-node-type="card"
            data-editor-node-label="Contacto Telegram"
            data-editor-grouped="true"
            initial={isEditing ? false : { opacity: 0, x: 20 }}
            whileInView={isEditing ? undefined : { opacity: 1, x: 0 }}
            whileHover={isEditing ? undefined : { y: -2, scale: 1.01 }}
            transition={isEditing ? undefined : { duration: 0.45, type: "spring", stiffness: 320, damping: 22 }}
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`group rounded-xl border border-border bg-card/90 p-4 md:p-5 lg:p-7 text-center shadow-md backdrop-blur-sm flex-1 max-w-xs ${
              isEditing ? "" : "transition-all duration-300 hover:border-primary/45 hover:shadow-lg"
            }`}
            style={buildInlineStyleFromOverride(telegramCardOverride, allowGeometryOverrides)}
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/18 group-hover:bg-primary/26 md:mb-4 md:h-14 md:w-14">
              <TelegramIcon className="h-6 w-6 text-primary md:h-7 md:w-7" />
            </div>
            <h3 
              ref={telegramTitleRef}
              data-editor-node-id="contact-telegram-title"
              data-editor-node-type="text"
              data-editor-node-label="Título Telegram"
              className="mb-2 font-serif text-base text-foreground md:text-xl"
              style={buildInlineStyleFromOverride(telegramTitleOverride, allowGeometryOverrides)}
            >
              {telegramTitle}
            </h3>
            <p 
              ref={telegramDescRef}
              data-editor-node-id="contact-telegram-description"
              data-editor-node-type="text"
              data-editor-node-label="Descripción Telegram"
              className="mb-3 text-sm text-muted-foreground md:mb-4 md:text-base"
              style={buildInlineStyleFromOverride(telegramDescriptionOverride, allowGeometryOverrides)}
            >
              {telegramDescription}
            </p>
            <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium md:text-sm ${CAMPAIGN_PRIMARY_CTA_CLASS}`}>
              <span 
                ref={telegramHandleRef}
                data-editor-node-id="contact-telegram-handle"
                data-editor-node-type="text"
                data-editor-node-label="Handle Telegram"
                className="truncate"
                style={buildInlineStyleFromOverride(telegramHandleOverride, allowGeometryOverrides)}
              >
                {telegramHandle}
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
