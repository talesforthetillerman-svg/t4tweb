"use client"

import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

// DISABLED: This component was causing fallback/rollback issues in /editor with retries
// The editor runs without state applier - using React component state instead
export function HomeEditorStateApplier({ nodes }: { nodes: HomeEditorNodeOverride[] }) {
  // Stub - no-op to prevent fallback issues
  return null
}