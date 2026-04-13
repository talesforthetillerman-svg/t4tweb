"use client"

import { motion } from "framer-motion"
import Image from "next/image"

export function BoatParallax() {
  return (
    <motion.div
      initial={{ x: "-20vw" }}
      animate={{
        x: "110vw",
        rotate: [0, 5, 0, -5, 0],
        y: [0, -8, 0, -5, 0],
      }}
      transition={{
        x: {
          duration: 26,
          repeat: Infinity,
          ease: "linear",
        },
        rotate: {
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        },
        y: {
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      className="absolute left-0 pointer-events-none"
      style={{ top: "-340px" }}
    >
      <motion.div
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.08, 0.88, 1],
        }}
      >
        <Image
          src="/images/t4tPics/paper-boat-sin-fondo.png"
          alt="Barco navegando"
          width={816}
          height={288}
          className="bg-transparent"
          style={{ background: "transparent" }}
          priority
        />
      </motion.div>
    </motion.div>
  )
}