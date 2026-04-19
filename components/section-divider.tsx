"use client"

import { motion } from "framer-motion"

export function SectionDivider() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative h-8 w-full bg-gradient-to-b from-transparent via-black/10 to-transparent md:h-12"
    />
  )
}
