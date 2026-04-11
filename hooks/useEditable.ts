"use client"

import { useEffect, useRef, useCallback } from "react"
import { useVisualEditor } from "@/components/visual-editor"

interface UseEditableOptions {
  id: string
  type: 'button' | 'link' | 'image' | 'box' | 'section' | 'logo' | 'text' | 'video'
  label: string
  parentId?: string | null
}

export function useEditable<T extends HTMLElement>({
  id,
  type,
  label,
  parentId = null,
}: UseEditableOptions) {
  const ref = useRef<T>(null)
  const { isEditing, registerEditable, editableElements } = useVisualEditor()

  const elementData = editableElements.get(id)

  // Register element when editing starts
  useEffect(() => {
    if (!isEditing || !ref.current) return

    const el = ref.current
    const rect = el.getBoundingClientRect()

    registerEditable({
      id,
      type,
      label,
      parentId,
      element: el,
      originalRect: rect,
      transform: { x: 0, y: 0 },
      dimensions: { width: el.offsetWidth, height: el.offsetHeight },
    })
  }, [isEditing, id, type, label, parentId, registerEditable])

  // Apply editor state to element declaratively
  useEffect(() => {
    if (!isEditing || !ref.current || !elementData) return

    const el = ref.current
    const { transform, dimensions } = elementData

    // Apply transform for position
    el.style.transform = `translate(${transform.x}px, ${transform.y}px)`
    el.style.transformOrigin = 'top left'

    // Apply dimensions if they differ from natural size
    const naturalWidth = elementData.originalRect?.width || 0
    const naturalHeight = elementData.originalRect?.height || 0

    if (Math.abs(dimensions.width - naturalWidth) > 1) {
      el.style.width = `${dimensions.width}px`
    } else {
      el.style.width = ''
    }

    if (Math.abs(dimensions.height - naturalHeight) > 1) {
      el.style.height = `${dimensions.height}px`
    } else {
      el.style.height = ''
    }
  }, [isEditing, elementData, id])

  // Clean up styles when editing stops
  useEffect(() => {
    if (!isEditing || !ref.current) return

    const el = ref.current
    return () => {
      el.style.transform = ''
      el.style.transformOrigin = ''
      el.style.width = ''
      el.style.height = ''
    }
  }, [isEditing])

  return ref
}
