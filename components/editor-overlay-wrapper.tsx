"use client"

import { usePathname } from "next/navigation"
import { VisualEditorOverlay } from "@/components/visual-editor"

/**
 * Conditionally render VisualEditorOverlay ONLY in /editor route
 * This prevents the editor overlay from mounting globally in all routes
 * and causing unnecessary overlay mounts with isEditing=false
 */
export function EditorOverlayWrapper() {
  const pathname = usePathname()
  const isEditorRoute = pathname === "/editor"

  if (!isEditorRoute) {
    return null
  }

  return <VisualEditorOverlay />
}
