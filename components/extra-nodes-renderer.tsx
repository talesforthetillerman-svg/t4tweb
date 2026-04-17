"use client"

import { useMemo, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { TEXT_EMPHASIS_SHADOW } from "@/lib/hero-layout-styles"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

type ExtraNodeKind = "text" | "button" | "card" | "overlay"

const EXTRA_NODE_PREFIX = "extra-"

function getExtraNodeKind(node: HomeEditorNodeOverride): ExtraNodeKind | null {
  if (!node.nodeId.startsWith(EXTRA_NODE_PREFIX)) return null
  const kind = node.content.extraNodeType || node.nodeType
  if (kind === "text" || kind === "button" || kind === "card" || kind === "overlay") return kind
  return null
}

function getParentSectionId(node: HomeEditorNodeOverride): string | null {
  return typeof node.content.parentSection === "string" && node.content.parentSection.trim()
    ? node.content.parentSection.trim()
    : null
}

function buildExtraNodeStyle(node: HomeEditorNodeOverride, kind: ExtraNodeKind): CSSProperties {
  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${Math.max(8, node.geometry.width)}px`,
    height: `${Math.max(8, node.geometry.height)}px`,
    transform: `translate(${node.geometry.x}px, ${node.geometry.y}px)`,
    transformOrigin: "top left",
    zIndex: kind === "overlay" ? 8 : 20,
    color: node.style.color,
    backgroundColor: node.style.backgroundColor,
    fontSize: node.style.fontSize,
    fontFamily: node.style.fontFamily,
    fontWeight: node.style.fontWeight,
    fontStyle: node.style.fontStyle,
    textDecoration: node.style.textDecoration,
    display: kind === "button" ? "inline-flex" : kind === "text" ? "block" : "flex",
    alignItems: kind === "text" ? undefined : "center",
    justifyContent: kind === "text" ? undefined : "center",
    padding: kind === "text" ? undefined : kind === "button" ? "0 18px" : "16px",
    borderRadius: kind === "text" ? undefined : "8px",
    border: kind === "card" ? "1px solid rgba(255,255,255,0.18)" : undefined,
    backdropFilter: kind === "overlay" ? "blur(2px)" : undefined,
    pointerEvents: kind === "button" ? "auto" : "none",
    whiteSpace: kind === "text" ? "pre-wrap" : undefined,
    overflow: "hidden",
  }

  if ((kind === "text" || kind === "button") && node.style.textShadowEnabled) {
    style.textShadow = TEXT_EMPHASIS_SHADOW
  }
  if ((kind === "text" || kind === "button") && node.style.gradientEnabled) {
    style.background = `linear-gradient(90deg, ${node.style.gradientStart || "#FFB15A"}, ${node.style.gradientEnd || "#FF6C00"})`
    style.backgroundClip = "text"
    style.WebkitBackgroundClip = "text"
    style.WebkitTextFillColor = "transparent"
    style.color = "transparent"
  }

  return style
}

export function ExtraNodesRenderer({ nodes }: { nodes: HomeEditorNodeOverride[] }) {
  const extraNodes = useMemo(() => nodes.filter((node) => getExtraNodeKind(node) !== null), [nodes])

  if (typeof document === "undefined" || extraNodes.length === 0) return null

  return (
    <>
      {extraNodes.map((node) => {
        const kind = getExtraNodeKind(node)
        const parentSectionId = getParentSectionId(node)
        if (!kind || !parentSectionId) return null
        const parent = document.querySelector<HTMLElement>(`[data-editor-node-id="${parentSectionId}"]`)
        if (!parent) return null

        const commonProps = {
          "data-extra-node-id": node.nodeId,
          style: buildExtraNodeStyle(node, kind),
        }

        if (kind === "button") {
          return createPortal(
            <a {...commonProps} href={node.content.href || "#"}>{node.content.text || "New button"}</a>,
            parent
          )
        }

        return createPortal(
          <div {...commonProps} aria-hidden={kind === "overlay" ? true : undefined}>
            {kind === "text" ? node.content.text || "New text" : null}
          </div>,
          parent
        )
      })}
    </>
  )
}
