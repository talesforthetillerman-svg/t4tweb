'use client'

import { useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

interface ScrollAnimationConfig {
  opacityStart?: number
  opacityEnd?: number
  scaleStart?: number
  scaleEnd?: number
  yStart?: number
  yEnd?: number
}

/**
 * Hook centralizado para controlar animaciones según scroll
 * Proporciona valores transformados para opacity, scale, y translateY
 * 
 * Uso:
 * const { opacity, scale, y } = useScrollAnimation(ref, {
 *   opacityStart: 0, opacityEnd: 1,
 *   scaleStart: 0.9, scaleEnd: 1,
 * })
 */
export function useScrollAnimation(
  ref: React.RefObject<HTMLElement | null>,
  config?: ScrollAnimationConfig
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const defaults = {
    opacityStart: 0.82,
    opacityEnd: 1,
    scaleStart: 0.98,
    scaleEnd: 1,
    yStart: 12,
    yEnd: 0,
    ...config,
  }

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [defaults.opacityStart, defaults.opacityEnd, defaults.opacityEnd, defaults.opacityStart]
  )

  const scale = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [defaults.scaleStart, defaults.scaleStart, defaults.scaleEnd, defaults.scaleEnd]
  )

  const y = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [defaults.yStart, defaults.yStart, defaults.yEnd, defaults.yEnd]
  )

  return { opacity, scale, y, scrollYProgress }
}

/**
 * Hook especializado para imagen dentro de sticky wrapper (tipo Apple)
 * Usa parallax inverso: la imagen se mueve hacia arriba al scrollear
 */
export function useStickyImageAnimation(
  ref: React.RefObject<HTMLElement | null>
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Imagen: fade in, small zoom, parallax leve hacia arriba
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.9, 1],
    [0, 1, 1, 0]
  )

  const scale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [1, 1.05, 1.08, 1.1]
  )

  const y = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0, -30, -60]
  )

  return { opacity, scale, y, scrollYProgress }
}

/**
 * Hook para contenido que aparece encima de imágenes
 * Controla opacidad y movimiento vertical
 */
export function useContentAnimation(
  ref: React.RefObject<HTMLElement | null>
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [0.9, 1, 1, 0.9]
  )

  const y = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [20, 0, 0, -20]
  )

  return { opacity, y, scrollYProgress }
}

/**
 * Hook para parallax de fondo (zoom leve)
 * Usado en imágenes de sección para crear movimiento vivo
 */
export function useParallaxZoom(
  ref: React.RefObject<HTMLElement | null>
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Scale progresivo: zoom muy leve sin ser agresivo
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [1, 1.02, 1.04]
  )

  // Opacity suave
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.8, 1, 1, 0.8]
  )

  return { scale, opacity }
}

/**
 * Hook para stagger animations en listas
 * Devuelve delay apropiado basado en índice
 */
export function useStaggerDelay(index: number, baseDelay = 0.05) {
  return baseDelay * index
}
