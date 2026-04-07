"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { useVisualEditor } from "@/components/visual-editor"

const view = { once: true, amount: 0.25 as const }

type SectionHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  prepend?: ReactNode
  footer?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  dataEditId?: string
  dataEditType?: string
  dataEditLabel?: string
}

/**
 * Shared section title stack: eyebrow → heading → optional body → optional footer.
 * Uses global typography tokens for consistent rhythm with the rest of the site.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  prepend,
  footer,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
  dataEditId,
  dataEditType,
  dataEditLabel,
}: SectionHeaderProps) {
  const { isEditing } = useVisualEditor()
  return (
    <div className={`mx-auto max-w-3xl text-center ${className}`}>
      {prepend ? <div className="mb-[var(--spacing-md)]">{prepend}</div> : null}

      <motion.span
        initial={isEditing ? false : { opacity: 0, y: 8 }}
        whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
        viewport={isEditing ? undefined : view}
        transition={isEditing ? undefined : { duration: 0.4 }}
        className="mb-[var(--spacing-sm)] block text-[length:var(--text-small)] font-semibold uppercase tracking-[0.2em] text-primary"
        data-editor-node-id={dataEditId ? `${dataEditId}-eyebrow` : undefined}
        data-editor-node-type="text"
        data-editor-node-label={dataEditLabel ? `${dataEditLabel} Eyebrow` : undefined}
      >
        {eyebrow}
      </motion.span>

      <motion.h2
        initial={isEditing ? false : { opacity: 0, y: 10 }}
        whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
        viewport={isEditing ? undefined : view}
        transition={isEditing ? undefined : { duration: 0.45, delay: 0.04 }}
        className={`mb-[var(--spacing-md)] text-balance font-serif text-[length:var(--text-h2)] leading-[var(--line-height-tight)] text-foreground ${titleClassName}`}
        data-editor-node-id={dataEditId ? `${dataEditId}-title` : undefined}
        data-editor-node-type="text"
        data-editor-node-label={dataEditLabel ? `${dataEditLabel} Title` : undefined}
      >
        {title}
      </motion.h2>

      {description ? (
        <motion.p
          initial={isEditing ? false : { opacity: 0, y: 10 }}
          whileInView={isEditing ? undefined : { opacity: 1, y: 0 }}
          viewport={isEditing ? undefined : view}
          transition={isEditing ? undefined : { duration: 0.45, delay: 0.08 }}
          className={`mx-auto max-w-2xl text-[length:var(--text-body)] leading-[var(--line-height-relaxed)] text-muted-foreground ${descriptionClassName}`}
          data-editor-node-id={dataEditId ? `${dataEditId}-description` : undefined}
          data-editor-node-type="text"
          data-editor-node-label={dataEditLabel ? `${dataEditLabel} Description` : undefined}
        >
          {description}
        </motion.p>
      ) : null}

      {footer ? <div className="mt-[var(--spacing-md)]">{footer}</div> : null}
    </div>
  )
}
