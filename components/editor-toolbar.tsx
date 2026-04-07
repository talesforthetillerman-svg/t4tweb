"use client"

import { useState } from "react"

interface EditorToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onDeploy: () => void
  onExit: () => void
  deployStatus: string | null
}

export function EditorToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeploy,
  onExit,
  deployStatus,
}: EditorToolbarProps) {
  return (
    <div data-editor-toolbar className="fixed top-3 left-3 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-3 py-2 text-white">
      <button
        aria-label="Undo"
        title="Undo"
        onClick={onUndo}
        disabled={!canUndo}
        className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40"
      >
        ↶
      </button>
      <button
        aria-label="Redo"
        title="Redo"
        onClick={onRedo}
        disabled={!canRedo}
        className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40"
      >
        ↷
      </button>
      <button
        aria-label="Deploy"
        title="Deploy"
        onClick={onDeploy}
        className="rounded p-1.5 hover:bg-white/10"
      >
        🚀
      </button>
      <button
        aria-label="Exit"
        title="Exit"
        onClick={onExit}
        className="rounded p-1.5 hover:bg-white/10"
      >
        ⎋
      </button>
      {deployStatus && (
        <span className="ml-1 rounded bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-wide">
          {deployStatus}
        </span>
      )}
    </div>
  )
}
