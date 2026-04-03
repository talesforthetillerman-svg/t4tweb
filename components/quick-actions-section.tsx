"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"

export function QuickActionsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { opacity, y } = useScrollAnimation(sectionRef)

  const actions = [
    {
      title: "Listen Now",
      description: "Stream on all platforms",
      icon: ListenIcon,
      href: "#live",
      color: "bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600",
    },
    {
      title: "See Shows",
      description: "Check upcoming dates",
      icon: CalendarIcon,
      href: "https://www.bandsintown.com/a/15468933-tales-for-the-tillerman",
      external: true,
      color: "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600",
    },
    {
      title: "Press Kit",
      description: "Download materials",
      icon: DownloadIcon,
      href: "#press-kit",
      color: "bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600",
    },
    {
      title: "Book Us",
      description: "For booking inquiries",
      icon: BookIcon,
      href: "#contact",
      color: "bg-gradient-to-br from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600",
    },
  ]

  return (
    <section 
      id="quick-actions" 
      ref={sectionRef} 
      className="relative py-8 md:py-10 overflow-hidden bg-black/50"
      data-edit-id="quick-actions-section"
      data-edit-type="section"
      data-edit-label="Quick Actions"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          style={{ opacity, y }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
        >
          {actions.map((action, index) => (
            <motion.a
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.03 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              href={action.href}
              target={action.external ? "_blank" : undefined}
              rel={action.external ? "noopener noreferrer" : undefined}
              className={`group flex flex-col items-center justify-center p-4 md:p-5 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${action.color}`}
              data-edit-id={`quick-action-${index}`}
              data-edit-type="button"
              data-edit-label={action.title}
            >
              <div className="mb-2">
                <action.icon />
              </div>
              <h3 className="text-xs md:text-sm text-center">{action.title}</h3>
              <p className="text-[10px] md:text-xs opacity-90 text-center mt-0.5">
                {action.description}
              </p>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function ListenIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5h3V9h4v3h3l-5 5z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z" />
    </svg>
  )
}
