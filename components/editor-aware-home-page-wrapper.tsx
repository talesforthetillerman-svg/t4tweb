"use client"

import { useVisualEditor } from "@/components/visual-editor"
import { ReactNode } from "react"

/**
 * Wrapper that prevents rendering content in /editor until editor state is ready
 * This avoids the "fallback visual" where published content shows before being replaced
 */
export function EditorAwareHomePageWrapper({ children, isEditorRoute }: { children: ReactNode; isEditorRoute: boolean }) {
  const { isEditing, nodes } = useVisualEditor()

  // In editor route, wait until editing is activated and nodes are loaded
  // This prevents showing published content as a fallback
  if (isEditorRoute && (!isEditing || nodes.size === 0)) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white opacity-50 text-sm">Loading editor...</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
