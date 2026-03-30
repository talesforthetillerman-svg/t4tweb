"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import { SectionHeader } from "@/components/section-header"

const members = [
  {
    id: 1,
    fullName: "Janosch Puhe",
    role: "Main Vocals",
    image: "/images/members/Janosch Puhe2.JPG",
  },
  {
    id: 2,
    fullName: "J.Ma Garcia Lopez",
    role: "Keys and Synth",
    image: "/images/members/J.Ma Garcia Lopez2.JPG",
  },
  {
    id: 3,
    fullName: "Otto Lorenz Contreras",
    role: "Drums",
    image: "/images/members/Otto Lorenz Contreras.JPG",
  },
  {
    id: 4,
    fullName: "Robii Crowford",
    role: "E Guit",
    image: "/images/members/Robii Crowford.JPG",
  },
  {
    id: 5,
    fullName: "Tarik Benatmane",
    role: "E Bass",
    image: "/images/members/Tarik Benatmane.JPG",
  },
]

export function BandMembersSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const { opacity, y } = useScrollAnimation(sectionRef)

  const memberVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.04,
        duration: 0.42,
      },
    }),
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-background py-14 md:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div style={{ opacity, y }} className="mb-12 md:mb-14">
          <SectionHeader
            eyebrow="The Musicians"
            title="Meet the Band"
            description="Five musicians from diverse backgrounds, united by a passion for rhythm and groove."
          />
        </motion.div>

        {/* Interactive Member Display */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Member Photo Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary order-2 lg:order-1"
          >
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                animate={
                  activeIndex === index
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 1.02 }
                }
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className={`absolute inset-0 ${
                  activeIndex !== index && "pointer-events-none"
                }`}
              >
                <Image
                  src={member.image}
                  alt={member.fullName}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // Si la imagen falla, mostrar un gradiente
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.style.display = "none"
                    }
                  }}
                />
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />
                {/* Member info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-1">
                    {member.fullName}
                  </h3>
                  <p className="text-muted-foreground">{member.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Member Names List - Interactive */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3 order-1 lg:order-2"
          >
            {members.map((member, index) => (
              <motion.button
                key={member.id}
                custom={index}
                initial="hidden"
                whileInView="visible"
                variants={memberVariants}
                onClick={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`member-card ${
                  activeIndex === index ? "active" : ""
                }`}
              >
                <div>
                  <h3 className={`member-card-title ${
                    activeIndex === index
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}>
                    {member.fullName}
                  </h3>
                  <p className={`member-card-role ${
                    activeIndex === index
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}>
                    {member.role}
                  </p>
                </div>
                <div className="member-icon">
                  <span className="text-xs font-bold">{member.id}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
