import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "next-sanity"
import { roundLayoutPx } from "@/lib/hero-layout-styles"
import { DEFAULT_NAV_LINKS } from "@/lib/sanity/navigation-loader"
import type { HomeEditorNodeOverride } from "@/lib/sanity/home-editor-state"

interface DeployNodePayload {
  id: string
  type: string
  label: string
  isGrouped: boolean
  geometry: { x: number; y: number; width: number; height: number }
  style: {
    color?: string
    backgroundColor?: string
    opacity?: number
    contrast?: number
    saturation?: number
    brightness?: number
    negative?: boolean
    fontSize?: string
    fontFamily?: string
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
    textAlign?: "left" | "center" | "right"
    scale?: number
    minHeight?: string
    paddingTop?: string
    paddingBottom?: string
  }
  content: {
    text?: string
    textSegments?: HeroTitleSegment[]
    titleSegments?: HeroTitleSegment[]
    href?: string
    src?: string
    alt?: string
    videoUrl?: string
    mediaKind?: "image" | "video"
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
    accentText?: string
    accentGradientEnabled?: boolean
    accentGradientStart?: string
    accentGradientEnd?: string
    date?: string
    venue?: string
    city?: string
    country?: string
    genre?: string
    price?: string
    status?: string
    time?: string
    capacity?: string
    locationUrl?: string
  }
  explicitContent: boolean
  explicitStyle: boolean
  explicitPosition: boolean
  explicitSize: boolean
}

interface HeroTitleSegment {
  text: string
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  opacity: number
  fontSize?: string
  fontFamily?: string
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
}

interface DeployRequestPayload {
  level: "green" | "yellow" | "red"
  diagnosticMode?: boolean
  findings: Array<{ element: string; issue: string; severity: "green" | "yellow" | "red"; blocks: boolean }>
  nodes: DeployNodePayload[]
  allNodes?: DeployNodePayload[]
  changedNodeIds?: string[]
  heroElementStyles?: Record<string, Record<string, unknown>> // { [targetId]: { text?, color?, fontSize?, x?, y?, ... } }
}

interface DeployStepResult {
  step: "checking" | "saving" | "publishing" | "revalidating"
  ok: boolean
  message: string
}

interface NodeVerificationResult {
  storageTarget: string
  expected: Record<string, unknown>
  readBack: Record<string, unknown> | null
  matched: boolean
  mismatchReason: string | null
}

interface DeployEnvDiagnostics {
  SANITY_PROJECT_ID: "yes" | "no"
  NEXT_PUBLIC_SANITY_PROJECT_ID: "yes" | "no"
  SANITY_DATASET: "yes" | "no"
  NEXT_PUBLIC_SANITY_DATASET: "yes" | "no"
  SANITY_API_WRITE_TOKEN: "yes" | "no"
  SANITY_API_TOKEN: "yes" | "no"
}

const ROUTE_VERSION = "sanity-debug-v3-brutal"
const TARGET_SECTION = "hero"
const SANITY_DOC_TYPE = "heroSection"
const SANITY_DOC_NAV = "navigation"
const SANITY_DOC_INTRO = "introBanner"
const SANITY_DOC_HOME_EDITOR_STATE = "homeEditorState"
const HOME_EDITOR_STATE_DOCUMENT_ID = "homeEditorState-singleton"
const REVALIDATED_PATH = "/"
const INTRO_DOCUMENT_ID = "introBanner"
const SHOULD_REVALIDATE_PATH = process.env.EDITOR_DEPLOY_REVALIDATE_LOCAL_PATH !== "false"
const PUBLIC_REVALIDATE_URL = process.env.EDITOR_DEPLOY_PUBLIC_REVALIDATE_URL || ""
const PUBLIC_REVALIDATE_SECRET = process.env.EDITOR_DEPLOY_PUBLIC_REVALIDATE_SECRET || ""
const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK || ""

const INTRO_LAYOUT_IDS = new Set([
  "intro-section",
  "intro-banner-gif",
  "intro-banner-text",
  "intro-book-button",
  "intro-press-button",
])

/**
 * Public loaders use `perspective: "published"`. Deploy must patch the **published**
 * document id — never `drafts.*`, or the live site will keep reading stale data while
 * Studio shows edits on the draft layer.
 */
function toPublishedDocumentId(id: string): string {
  return id.startsWith("drafts.") ? id.slice("drafts.".length) : id
}

function isNavLayoutId(id: string): boolean {
  return id === "navigation" || id === "navigation-inner" || id.startsWith("nav-")
}

const HERO_NODE_IDS = new Set([
  "hero-section",
  "hero-bg-image",
  "hero-title",
  "hero-title-main",
  "hero-title-accent",
  "hero-subtitle",
  "hero-logo",
  "hero-scroll-indicator",
  "hero-buttons",
])

const INTRO_NODE_IDS = new Set([
  "intro-section",
  "intro-banner-gif",
  "intro-banner-text",
  "intro-book-button",
  "intro-press-button",
])

const RELEASE_NODE_IDS = new Set([
  "latest-release-section",
  "latest-release-bg",
  "latest-release-card",
  "latest-release-title",
  "latest-release-subtitle",
  "latest-release-watch-button",
  "latest-release-shows-button",
])

function isImageSrcPersistable(src: string): boolean {
  const value = src.trim()
  if (!value) return false
  if (value.startsWith("blob:") || value.startsWith("data:") || value.startsWith("javascript:")) return false
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return true
  return false
}

function parseSanityImageRefFromUrl(src: string, projectId: string, dataset: string): string | null {
  try {
    const url = new URL(src)
    if (url.hostname !== "cdn.sanity.io") return null
    const parts = url.pathname.split("/").filter(Boolean)
    // /images/{projectId}/{dataset}/{fileName.ext}
    if (parts.length < 4) return null
    if (parts[0] !== "images") return null
    if (parts[1] !== projectId) return null
    if (parts[2] !== dataset) return null
    const fileName = parts.slice(3).join("/")
    const extIndex = fileName.lastIndexOf(".")
    if (extIndex <= 0) return null
    const idPart = fileName.slice(0, extIndex).replace(/\//g, "-")
    const extPart = fileName.slice(extIndex + 1)
    if (!idPart || !extPart) return null
    return `image-${idPart}-${extPart}`
  } catch {
    return null
  }
}

function buildSanityImageFieldFromSrc(
  src: string,
  projectId: string,
  dataset: string
): { _type: "image"; asset: { _type: "reference"; _ref: string } } | null {
  const ref = parseSanityImageRefFromUrl(src, projectId, dataset)
  if (!ref) return null
  return {
    _type: "image",
    asset: {
      _type: "reference",
      _ref: ref,
    },
  }
}

function shouldVerifyInHomeEditorState(node: DeployNodePayload): boolean {
  if (node.id === "intro-banner-gif") return false
  const isImageLikeNode = node.type === "image" || node.type === "background"
  if (isImageLikeNode && node.explicitContent) return true
  if (HERO_NODE_IDS.has(node.id)) return false
  if (isNavLayoutId(node.id)) return false
  if (INTRO_NODE_IDS.has(node.id)) return false
  return node.explicitContent || node.explicitStyle || node.explicitPosition || node.explicitSize
}

function toChangedNodeIds(payload: DeployRequestPayload): string[] {
  if (Array.isArray(payload.changedNodeIds) && payload.changedNodeIds.length > 0) {
    return Array.from(new Set(payload.changedNodeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)))
  }
  return []
}

function markerMatchesNode(marker: string, nodeId: string): boolean {
  return marker === nodeId || marker.startsWith(`${nodeId}:`) || marker.includes(nodeId)
}

function getNodeFailureMarker(nodeId: string, markers: string[]): string | null {
  return markers.find((m) => markerMatchesNode(m, nodeId)) || null
}

function approxEqualNumber(a: unknown, b: unknown): boolean {
  if (typeof a !== "number" || typeof b !== "number") return false
  return Math.abs(a - b) < 0.01
}

function normalizeComparableValue(value: unknown): unknown {
  if (typeof value === "number") return roundLayoutPx(value)
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.parse(JSON.stringify(value))
  return value
}

function valuesMatch(expected: unknown, actual: unknown): boolean {
  if (typeof expected === "number" && typeof actual === "number") {
    return approxEqualNumber(expected, actual)
  }
  if (Array.isArray(expected) || (expected && typeof expected === "object")) {
    return JSON.stringify(expected) === JSON.stringify(actual)
  }
  return expected === actual
}

function compareMaps(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
): { matched: boolean; mismatchReason: string | null } {
  for (const [key, value] of Object.entries(expected)) {
    if (!valuesMatch(value, actual[key])) {
      return {
        matched: false,
        mismatchReason: `mismatch:${key} expected=${JSON.stringify(value)} actual=${JSON.stringify(actual[key])}`,
      }
    }
  }
  return { matched: true, mismatchReason: null }
}

/** Persist brand name, CTA, and link rows from editor nodes (explicitContent). */
function buildNavigationContentPatch(
  nodes: DeployNodePayload[],
  existing: {
    brandName?: string
    links?: Array<{ label: string; href: string }>
    ctaLabel?: string
    ctaHref?: string
  }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const baseLinks = Array.isArray(existing.links) && existing.links.length > 0
    ? existing.links.map((l) => ({ label: l.label || "", href: l.href || "" }))
    : DEFAULT_NAV_LINKS.map((l) => ({ ...l }))
  let linksDirty = false

  for (const node of nodes) {
    if (!node.explicitContent) continue

    if (node.id === "nav-brand-name") {
      const t = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      if (t) patch.brandName = t
      continue
    }

    const linkMatch = /^nav-link-(\d+)$/.exec(node.id)
    const mobileMatch = /^nav-mobile-link-(\d+)$/.exec(node.id)
    const mi = linkMatch ? Number(linkMatch[1]) : mobileMatch ? Number(mobileMatch[1]) : -1
    if (mi >= 0 && mi < baseLinks.length) {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) {
        baseLinks[mi] = { ...baseLinks[mi], label: text }
        linksDirty = true
      }
      if (href) {
        baseLinks[mi] = { ...baseLinks[mi], href }
        linksDirty = true
      }
      continue
    }

    if (node.id === "nav-book-button" || node.id === "nav-mobile-book-button") {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) patch.ctaLabel = text
      if (href) patch.ctaHref = href
    }
  }

  if (linksDirty) patch.links = baseLinks
  return patch
}

function parsePxNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const px = /^([\d.]+)px$/i.exec(value.trim())
  if (px) return Math.round(parseFloat(px[1]))
  return undefined
}

/** Map visual-editor `node.style` (color, fontSize, fontWeight) into Sanity elementStyles shape. */
function mergeDeployVisualStyleIntoTarget(target: Record<string, unknown>, node: DeployNodePayload): void {
  if (!node.explicitStyle) return
  const st = node.style as Record<string, unknown>
  if (typeof st.color === "string" && st.color) target.color = st.color
  const fs = parsePxNumber(st.fontSize as string | undefined)
  if (typeof fs === "number") target.fontSize = fs
  const fw = st.fontWeight
  if (fw !== undefined && fw !== "") {
    const n = typeof fw === "number" ? fw : parseInt(String(fw), 10)
    if (!Number.isNaN(n)) target.fontWeight = n
  }
}

function buildIntroContentPatch(nodes: DeployNodePayload[]): { patch: Record<string, unknown>; skipped: string[] } {
  const patch: Record<string, unknown> = {}
  const skipped: string[] = []
  for (const node of nodes) {
    if (!node.explicitContent) continue
    if (node.id === "intro-banner-text") {
      const t = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      if (t) patch.bannerText = t
    }
    if (node.id === "intro-banner-gif") {
      const src = typeof node.content?.src === "string" ? node.content.src.trim() : ""
      if (src && isImageSrcPersistable(src)) {
        patch.gifUrl = src
      } else if (src) {
        skipped.push("intro-banner-gif:src(blob/data url)")
      }
    }
    if (node.id === "intro-book-button") {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) patch.bookLabel = text
      if (href) patch.bookHref = href
    }
    if (node.id === "intro-press-button") {
      const text = typeof node.content?.text === "string" ? node.content.text.trim() : ""
      const href = typeof node.content?.href === "string" ? node.content.href.trim() : ""
      if (text) patch.pressLabel = text
      if (href) patch.pressHref = href
    }
  }
  return { patch, skipped }
}

function getEnvDiagnostics(): DeployEnvDiagnostics {
  const sanityProjectId = process.env.SANITY_PROJECT_ID
  const nextPublicSanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const sanityApiWriteToken = process.env.SANITY_API_WRITE_TOKEN
  const sanityApiToken = process.env.SANITY_API_TOKEN

  return {
    SANITY_PROJECT_ID: sanityProjectId ? "yes" : "no",
    NEXT_PUBLIC_SANITY_PROJECT_ID: nextPublicSanityProjectId ? "yes" : "no",
    SANITY_DATASET: process.env.SANITY_DATASET ? "yes" : "no",
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET ? "yes" : "no",
    SANITY_API_WRITE_TOKEN: sanityApiWriteToken ? "yes" : "no",
    SANITY_API_TOKEN: sanityApiToken ? "yes" : "no",
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function triggerPublicRevalidate(log: (msg: string, data?: unknown) => void): Promise<{ attempted: boolean; ok: boolean; message: string }> {
  if (!PUBLIC_REVALIDATE_URL) {
    return { attempted: false, ok: false, message: "Public revalidate URL not configured." }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (PUBLIC_REVALIDATE_SECRET) {
      headers["x-webhook-secret"] = PUBLIC_REVALIDATE_SECRET
      headers.Authorization = `Bearer ${PUBLIC_REVALIDATE_SECRET}`
    }

    const res = await fetch(PUBLIC_REVALIDATE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "editor-deploy",
        path: REVALIDATED_PATH,
        at: new Date().toISOString(),
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      const message = `Public revalidate failed (${res.status}): ${text.slice(0, 240)}`
      log("public revalidate failed", { status: res.status, body: text.slice(0, 240) })
      return { attempted: true, ok: false, message }
    }

    const bodyText = await res.text()
    log("public revalidate success", { status: res.status, body: bodyText.slice(0, 240) })
    return { attempted: true, ok: true, message: "Public site revalidate hook triggered." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    log("public revalidate exception", { message })
    return { attempted: true, ok: false, message: `Public revalidate exception: ${message}` }
  }
}

async function triggerVercelDeploy(log: (msg: string, data?: unknown) => void): Promise<{ attempted: boolean; ok: boolean; message: string }> {
  if (!VERCEL_DEPLOY_HOOK) {
    return { attempted: false, ok: false, message: "Vercel deploy hook not configured." }
  }

  try {
    const res = await fetch(VERCEL_DEPLOY_HOOK, {
      method: "POST",
      cache: "no-store",
    })
    if (!res.ok) {
      const text = await res.text()
      const message = `Vercel deploy hook failed (${res.status}): ${text.slice(0, 240)}`
      log("vercel deploy hook failed", { status: res.status, body: text.slice(0, 240) })
      return { attempted: true, ok: false, message }
    }

    const bodyText = await res.text()
    log("vercel deploy hook success", { status: res.status, body: bodyText.slice(0, 240) })
    return { attempted: true, ok: true, message: "Vercel deploy hook triggered." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    log("vercel deploy hook exception", { message })
    return { attempted: true, ok: false, message: `Vercel deploy hook exception: ${message}` }
  }
}

export async function GET() {
  const envDiagnostics = getEnvDiagnostics()
  return NextResponse.json({
    routeVersion: ROUTE_VERSION,
    publishedDocumentId: "resolved-at-deploy",
    publishedDocumentType: SANITY_DOC_TYPE,
    targetSection: TARGET_SECTION,
    heroTitleMode: "unknown",
    revalidatedPath: REVALIDATED_PATH,
    localRevalidateEnabled: SHOULD_REVALIDATE_PATH,
    publicRevalidateUrlConfigured: !!PUBLIC_REVALIDATE_URL,
    vercelDeployHookConfigured: !!VERCEL_DEPLOY_HOOK,
    diagnostics: envDiagnostics,
    envDiagnostics,
  })
}


/**
 * Normalize title segments for comparison, ignoring _key and non-render fields.
 * Only compares: text, color, bold, italic, underline, opacity, gradientEnabled, gradientStart, gradientEnd
 */
function normalizeTitleSegments(segments: unknown[]): Array<{
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  opacity?: number
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
}> {
  if (!Array.isArray(segments)) return []
  
  return segments
    .filter((seg) => seg && typeof seg === "object")
    .map((seg) => {
      const s = seg as Record<string, unknown>
      return {
        text: typeof s.text === "string" ? s.text.trim() : "",
        color: typeof s.color === "string" ? s.color : undefined,
        bold: typeof s.bold === "boolean" ? s.bold : undefined,
        italic: typeof s.italic === "boolean" ? s.italic : undefined,
        underline: typeof s.underline === "boolean" ? s.underline : undefined,
        opacity: typeof s.opacity === "number" ? s.opacity : undefined,
        gradientEnabled: typeof s.gradientEnabled === "boolean" ? s.gradientEnabled : undefined,
        gradientStart: typeof s.gradientStart === "string" ? s.gradientStart : undefined,
        gradientEnd: typeof s.gradientEnd === "string" ? s.gradientEnd : undefined,
      }
    })
    .filter((seg) => seg.text.length > 0) // remove empty segments
}


export async function POST(request: Request) {
  const startTime = Date.now()
  const log = (msg: string, data?: unknown) => {
    const elapsed = Date.now() - startTime
    console.log(`[editor-deploy ${elapsed}ms] ${msg}`, data ? JSON.stringify(data, null, 2) : "")
  }

  try {
    const payload = (await request.json()) as DeployRequestPayload
    log("payload received", { nodeCount: payload.nodes.length, level: payload.level })
    const releasePayloadNodes = payload.nodes.filter((node) => RELEASE_NODE_IDS.has(node.id))
    log("[RELEASE-TRACE][route][payload]", {
      releaseNodeCount: releasePayloadNodes.length,
      releaseNodes: releasePayloadNodes.map((node) => ({
        id: node.id,
        geometry: node.geometry,
        content: node.content,
        style: node.style,
        explicitContent: node.explicitContent,
        explicitStyle: node.explicitStyle,
        explicitPosition: node.explicitPosition,
        explicitSize: node.explicitSize,
      })),
    })
    const introPayloadNodes = payload.nodes.filter((node) => INTRO_NODE_IDS.has(node.id))
    log("[INTRO-TRACE][route][payload]", {
      introNodeCount: introPayloadNodes.length,
      introNodes: introPayloadNodes.map((node) => ({
        id: node.id,
        geometry: node.geometry,
        content: node.content,
        style: node.style,
        explicitContent: node.explicitContent,
        explicitStyle: node.explicitStyle,
        explicitPosition: node.explicitPosition,
        explicitSize: node.explicitSize,
      })),
    })
    const sanityProjectId = process.env.SANITY_PROJECT_ID
    const nextPublicSanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const projectId = sanityProjectId || nextPublicSanityProjectId
    const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
    const sanityApiWriteToken = process.env.SANITY_API_WRITE_TOKEN
    const sanityApiToken = process.env.SANITY_API_TOKEN
    const sanityToken = sanityApiWriteToken || sanityApiToken
    const diagnostics = getEnvDiagnostics()
    const envDiagnostics = diagnostics

    log("environment", { projectId: projectId ? "set" : "missing", dataset, writeToken: sanityToken ? "set" : "missing" })

    const heroTitleNode = payload.nodes.find((node) => node.id === "hero-title" && node.type === "text") // legacy alias
    const heroTitleGroupNode = payload.nodes.find((node) => node.id === "hero-title" && node.type === "group") // new grouped node
    const heroTitleMainNode = payload.nodes.find((node) => node.id === "hero-title-main" && node.type === "text")
    const heroTitleAccentNode = payload.nodes.find((node) => node.id === "hero-title-accent" && node.type === "text")
    const heroSubtitleNode = payload.nodes.find((node) => node.id === "hero-subtitle" && node.type === "text")
    const incomingSegments = Array.isArray(heroTitleNode?.content?.textSegments)
      ? (heroTitleNode.content.textSegments as HeroTitleSegment[])
      : []
    const validSegments = incomingSegments.filter((segment) => typeof segment?.text === "string" && segment.text.length > 0)
    const hasSegments = validSegments.length >= 2
    const hasPlainText = typeof heroTitleNode?.content?.text === "string" && heroTitleNode.content.text.trim().length > 0
    const hasGroupedText = heroTitleGroupNode?.explicitContent && (typeof heroTitleGroupNode?.content?.text === "string" || typeof heroTitleGroupNode?.content?.accentText === "string")

    const steps: DeployStepResult[] = [{
      step: "checking",
      ok: true,
      message: "Endpoint reached: /api/editor-deploy.",
    }]

    steps.push({
      step: "checking",
      ok: true,
      message: `Env diagnostics (server-side): SANITY_PROJECT_ID: ${diagnostics.SANITY_PROJECT_ID}; NEXT_PUBLIC_SANITY_PROJECT_ID: ${diagnostics.NEXT_PUBLIC_SANITY_PROJECT_ID}; SANITY_DATASET: ${diagnostics.SANITY_DATASET}; NEXT_PUBLIC_SANITY_DATASET: ${diagnostics.NEXT_PUBLIC_SANITY_DATASET}; SANITY_API_WRITE_TOKEN: ${diagnostics.SANITY_API_WRITE_TOKEN}; SANITY_API_TOKEN: ${diagnostics.SANITY_API_TOKEN}; dataset value used: ${dataset}.`,
    })

    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.findings) || !payload.level) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload"], diagnostics, envDiagnostics }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload: nodes array is empty.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload.nodes"], diagnostics, envDiagnostics }, { status: 400 })
    }
    const changedNodeIds = toChangedNodeIds(payload)
    const changedNodeSet = new Set(changedNodeIds)
    const payloadNodeById = new Map(payload.nodes.map((node) => [node.id, node]))

    if (!projectId) {
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "checking",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: missing project id. Set SANITY_PROJECT_ID (preferred) or NEXT_PUBLIC_SANITY_PROJECT_ID.",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: "resolved-at-deploy",
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode: "unknown",
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes: [],
          skippedNodes: [],
          failedNodes: ["sanity-project-id"],
          diagnostics,
          envDiagnostics,
        },
        { status: 500 }
      )
    }

    if (!sanityToken) {
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "checking",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: missing write token. Set SANITY_API_WRITE_TOKEN or fallback SANITY_API_TOKEN.",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: "resolved-at-deploy",
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode: "unknown",
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes: [],
          skippedNodes: [],
          failedNodes: ["sanity-token"],
          diagnostics,
          envDiagnostics,
        },
        { status: 500 }
      )
    }

    const writeClient = createClient({
      projectId,
      dataset,
      apiVersion: "2024-01-01",
      useCdn: false,
      token: sanityToken,
      /** Must match loaders (`perspective: "published"`) so patches hit what the public site reads. */
      perspective: "published",
    })

    const [existingHero, existingNavigation, existingIntro] = await Promise.all([
      writeClient.fetch<{
        _id: string
        title?: string
        titleHighlight?: string
        titleSegments?: HeroTitleSegment[]
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(`*[_type == $type][0]{ _id, title, titleHighlight, titleSegments, elementStyles }`, { type: SANITY_DOC_TYPE }),
      writeClient.fetch<{
        _id: string
        brandName?: string
        links?: Array<{ label: string; href: string }>
        ctaLabel?: string
        ctaHref?: string
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(`*[_type == $navType][0]{ _id, brandName, links[]{ label, href }, ctaLabel, ctaHref, elementStyles }`, {
        navType: SANITY_DOC_NAV,
      }),
      writeClient.fetch<{
        _id: string
        bannerText?: string
        gifUrl?: string
        bookLabel?: string
        bookHref?: string
        pressLabel?: string
        pressHref?: string
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(
        `*[_type == $introType][0]{ _id, bannerText, gifUrl, bookLabel, bookHref, pressLabel, pressHref, elementStyles }`,
        { introType: SANITY_DOC_INTRO }
      ),
    ])
    log("document fetch", { hero: !!existingHero?._id, navigation: !!existingNavigation?._id, intro: !!existingIntro?._id })
    // Always use "legacy" mode: title + titleHighlight only. No titleSegments.
    const heroTitleMode: "legacy" | "segmented" = "legacy"

    if (!existingHero?._id) {
      steps.push({ step: "saving", ok: false, message: "Hero section document not found; refusing to create implicit duplicate." })
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "saving",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: heroSection document not found.",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: "resolved-at-deploy",
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode,
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes: [],
          skippedNodes: [],
          failedNodes: ["hero-section-document"],
          persistedFields: [],
          skippedFields: ["hero-logo", "hero-scroll-indicator", "hero-geometry"],
          diagnostics,
          envDiagnostics,
        },
        { status: 500 }
      )
    }

    const persistedFields: string[] = []
    const skippedFields: string[] = []
    const persistedNodes: string[] = []
    const skippedNodes: string[] = []
    let elementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const navElementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const introElementStylesInPayload: Record<string, Record<string, unknown>> = {}
    const failedNodes: string[] = []
    const heroPatch: Record<string, unknown> = {}

    // Clean up legacy titleSegments field if it exists
    if (Array.isArray(existingHero?.titleSegments) && existingHero.titleSegments.length > 0) {
      heroPatch.titleSegments = null
      skippedNodes.push("legacy-titleSegments-cleanup")
    }

    if (heroTitleNode?.explicitContent || heroTitleGroupNode?.explicitContent || heroTitleMainNode?.explicitContent || heroTitleAccentNode?.explicitContent || hasSegments) {
      if (hasGroupedText) {
        // New grouped editor structure: hero-title group node with text and accentText
        const groupMainText = typeof heroTitleGroupNode?.content?.text === "string" ? heroTitleGroupNode.content.text.trim() : ""
        const groupAccentText = typeof heroTitleGroupNode?.content?.accentText === "string" ? heroTitleGroupNode.content.accentText.trim() : ""
        if (groupMainText) {
          heroPatch.title = groupMainText
          if (!persistedFields.includes("title")) persistedFields.push("title")
          if (!persistedNodes.includes("hero-title")) persistedNodes.push("hero-title")
        }
        if (groupAccentText) {
          heroPatch.titleHighlight = groupAccentText
          if (!persistedFields.includes("titleHighlight")) persistedFields.push("titleHighlight")
          if (!persistedNodes.includes("hero-title")) persistedNodes.push("hero-title")
        }
        if (!groupMainText && !groupAccentText) {
          skippedFields.push("title")
          failedNodes.push("hero-title-empty")
          skippedNodes.push("hero-title")
        }
      } else if (hasSegments) {
        // Always use legacy mode: convert segments to title + titleHighlight
        heroPatch.title = validSegments[0].text.trim()
        if (!persistedFields.includes("title")) persistedFields.push("title")
        persistedNodes.push("hero-title-main")
        heroPatch.titleHighlight = validSegments[1].text.trim()
        if (!persistedFields.includes("titleHighlight")) persistedFields.push("titleHighlight")
        persistedNodes.push("hero-title-accent")
      } else if (hasPlainText) {
        heroPatch.title = (heroTitleNode!.content.text as string).trim()
        persistedFields.push("title")
        persistedNodes.push("hero-title")
      } else {
        const mainText = typeof heroTitleMainNode?.content?.text === "string" ? heroTitleMainNode.content.text.trim() : ""
        const accentText = typeof heroTitleAccentNode?.content?.text === "string" ? heroTitleAccentNode.content.text.trim() : ""
        if (mainText) {
          heroPatch.title = mainText
          if (!persistedFields.includes("title")) persistedFields.push("title")
          if (!persistedNodes.includes("hero-title-main")) persistedNodes.push("hero-title-main")
        }
        if (accentText) {
          heroPatch.titleHighlight = accentText
          if (!persistedFields.includes("titleHighlight")) persistedFields.push("titleHighlight")
          if (!persistedNodes.includes("hero-title-accent")) persistedNodes.push("hero-title-accent")
        }
        if (!mainText && !accentText) {
          skippedFields.push("title")
          failedNodes.push("hero-title-empty")
          skippedNodes.push("hero-title")
        }
      }
    }

    if (heroSubtitleNode?.explicitContent) {
      const heroSubtitleText = typeof heroSubtitleNode.content?.text === "string" ? heroSubtitleNode.content.text.trim() : ""
      if (heroSubtitleText) {
        heroPatch.subtitle = heroSubtitleText
        persistedFields.push("subtitle")
        persistedNodes.push("hero-subtitle")
      } else {
        skippedFields.push("subtitle")
        failedNodes.push("hero-subtitle-empty")
      }
    }

    const heroButtonsNode = payload.nodes.find((node) => node.id === "hero-buttons")
    if (heroButtonsNode?.explicitContent) {
      const buttons: Array<{ label: string; href: string; variant: string }> = []
      for (let i = 0; i < 2; i++) {
        const btnTextNode = payload.nodes.find((n) => n.id === `hero-button-${i + 1}`)
        const btnHrefNode = payload.nodes.find((n) => n.id === `hero-button-${i + 1}-href`)
        const btnText = btnTextNode?.explicitContent ? (typeof btnTextNode.content?.text === "string" ? btnTextNode.content.text.trim() : "") : ""
        const btnHref = btnHrefNode?.explicitContent ? (typeof btnHrefNode.content?.href === "string" ? btnHrefNode.content.href.trim() : "") : ""
        if (btnText) {
          buttons.push({ label: btnText, href: btnHref, variant: i === 0 ? "primary" : "secondary" })
        }
      }
      if (buttons.length > 0) {
        heroPatch.ctaButtons = buttons
        if (!persistedFields.includes("ctaButtons")) persistedFields.push("ctaButtons")
        if (!persistedNodes.includes("hero-buttons")) persistedNodes.push("hero-buttons")
      }
    }

    const heroScrollNode = payload.nodes.find((node) => node.id === "hero-scroll-indicator")
    if (heroScrollNode?.explicitContent) {
      const scrollText = typeof heroScrollNode.content?.text === "string" ? heroScrollNode.content.text.trim() : ""
      if (scrollText) {
        heroPatch.scrollLabel = scrollText
        if (!persistedFields.includes("scrollLabel")) persistedFields.push("scrollLabel")
        if (!persistedNodes.includes("hero-scroll-indicator")) persistedNodes.push("hero-scroll-indicator")
      }
    }

    // Doc-driven image writers: keep these nodes out of homeEditorState and persist directly
    // into the same Sanity docs consumed by loaders.
    const heroBgImageNode = payload.nodes.find((node) => node.id === "hero-bg-image")
    if (heroBgImageNode?.explicitContent) {
      const src = typeof heroBgImageNode.content?.src === "string" ? heroBgImageNode.content.src.trim() : ""
      if (!src) {
        skippedNodes.push("hero-bg-image:missing-content-src")
      } else if (!isImageSrcPersistable(src)) {
        skippedNodes.push("hero-bg-image:src(blob/data url)")
      } else {
        const imageField = buildSanityImageFieldFromSrc(src, projectId, dataset)
        if (!imageField) {
          skippedNodes.push("hero-bg-image:src(non-sanity-cdn url)")
        } else {
          heroPatch.backgroundImage = imageField
          if (!persistedFields.includes("backgroundImage")) persistedFields.push("backgroundImage")
          if (!persistedNodes.includes("hero-bg-image")) persistedNodes.push("hero-bg-image")
        }
      }
    }

    // hero-logo: src comes from Sanity, not from editor. Only styles are persistible.
    // Explicitly skip src persistence for hero-logo to avoid non-sanity-cdn url mismatch.
    const heroLogoNode = payload.nodes.find((node) => node.id === "hero-logo")
    if (heroLogoNode?.explicitContent) {
      // Skip src: logo URL must come from Sanity doc, not from editor
      // Only geometry/styles for logo are persistible (filters, scale, position)
      skippedNodes.push("hero-logo:src(editor-not-allowed-source)")
      if (!persistedNodes.includes("hero-logo")) persistedNodes.push("hero-logo")
    }

    /** Persist layout (translate/scale/size) for every hero block the visual editor can move — same as logo/title. */
    const HERO_LAYOUT_IDS = new Set([
      "hero-section",
      "hero-bg-image",
      "hero-title-main",
      "hero-title-accent",
      "hero-subtitle",
      "hero-logo",
      "hero-scroll-indicator",
      "hero-buttons",
    ])

    for (const node of payload.nodes) {
      if (!HERO_LAYOUT_IDS.has(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      if (!node.explicitPosition && !node.explicitSize && !hasScale && !node.explicitStyle) continue

      elementStylesInPayload[node.id] = { ...(elementStylesInPayload[node.id] || {}) }
      const s = elementStylesInPayload[node.id] as Record<string, unknown>
      if (node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if (node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000
      
      if (node.explicitStyle) {
        const st = node.style as Record<string, unknown>
        // Image/background effects
        if (node.id === "hero-bg-image" || node.id === "hero-logo") {
          if (typeof st.contrast === "number") s.contrast = Math.round(st.contrast * 100) / 100
          if (typeof st.saturation === "number") s.saturation = Math.round(st.saturation * 100) / 100
          if (typeof st.brightness === "number") s.brightness = Math.round(st.brightness * 100) / 100
          if (st.negative === true) s.negative = true
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
        }
        // Text styles
        if (node.id === "hero-title-main" || node.id === "hero-title-accent") {
          if (typeof st.color === "string") s.color = st.color
          if (typeof st.fontSize === "string") s.fontSize = st.fontSize
          if (typeof st.fontWeight === "string" || typeof st.fontWeight === "number") s.fontWeight = st.fontWeight
          if (st.bold === true) s.bold = true
          if (st.italic === true) s.italic = true
          if (st.underline === true) s.underline = true
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
          // Gradient properties
          if (st.gradientEnabled === true) s.gradientEnabled = true
          if (typeof st.gradientStart === "string") s.gradientStart = st.gradientStart
          if (typeof st.gradientEnd === "string") s.gradientEnd = st.gradientEnd
        }
        // Navigation card opacity
        if (node.id === "navigation-inner") {
          if (typeof st.opacity === "number") s.opacity = Math.round(st.opacity * 100) / 100
        }
      }
      
      log("hero layout captured", { id: node.id, x: s.x, y: s.y, w: s.width, h: s.height, scale: s.scale })
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    for (const node of payload.nodes) {
      if (!isNavLayoutId(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      if (!node.explicitPosition && !node.explicitSize && !hasScale) continue

      navElementStylesInPayload[node.id] = { ...(navElementStylesInPayload[node.id] || {}) }
      const s = navElementStylesInPayload[node.id] as Record<string, unknown>
      if (node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if (node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000
      log("nav layout captured", { id: node.id, x: s.x, y: s.y, w: s.width, h: s.height, scale: s.scale })
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    for (const node of payload.nodes) {
      if (!INTRO_LAYOUT_IDS.has(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      const hasLayout = node.explicitPosition || node.explicitSize || hasScale
      if (!hasLayout && !node.explicitStyle) continue

      introElementStylesInPayload[node.id] = { ...(introElementStylesInPayload[node.id] || {}) }
      const s = introElementStylesInPayload[node.id] as Record<string, unknown>
      if (node.explicitPosition) {
        s.x = roundLayoutPx(node.geometry.x)
        s.y = roundLayoutPx(node.geometry.y)
      }
      if (node.explicitSize) {
        s.width = roundLayoutPx(node.geometry.width)
        s.height = roundLayoutPx(node.geometry.height)
      }
      if (hasScale) s.scale = Math.round(scaleVal * 1000) / 1000
      if (node.explicitStyle) mergeDeployVisualStyleIntoTarget(s, node)
      log("intro layout captured", { id: node.id, x: s.x, y: s.y, w: s.width, h: s.height, scale: s.scale })
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    let mergedNavigationElementStyles: Record<string, unknown> | null = null
    if (Object.keys(navElementStylesInPayload).length > 0 && existingNavigation?._id) {
      const priorRaw = existingNavigation.elementStyles
      const prior =
        priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw) ? { ...priorRaw } : {}
      mergedNavigationElementStyles = { ...prior }
      for (const [targetId, incoming] of Object.entries(navElementStylesInPayload)) {
        if (typeof incoming === "object" && incoming !== null) {
          const prevTarget =
            mergedNavigationElementStyles[targetId] && typeof mergedNavigationElementStyles[targetId] === "object"
              ? (mergedNavigationElementStyles[targetId] as Record<string, unknown>)
              : {}
          mergedNavigationElementStyles[targetId] = { ...prevTarget, ...(incoming as Record<string, unknown>) }
        }
      }
      log("navigation element styles merged", { targets: Object.keys(mergedNavigationElementStyles) })
    }

    let mergedIntroElementStyles: Record<string, unknown> | null = null
    if (Object.keys(introElementStylesInPayload).length > 0) {
      const priorRaw = existingIntro?.elementStyles
      const prior =
        priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw) ? { ...priorRaw } : {}
      mergedIntroElementStyles = { ...prior }
      for (const [targetId, incoming] of Object.entries(introElementStylesInPayload)) {
        if (typeof incoming === "object" && incoming !== null) {
          const prevTarget =
            mergedIntroElementStyles[targetId] && typeof mergedIntroElementStyles[targetId] === "object"
              ? (mergedIntroElementStyles[targetId] as Record<string, unknown>)
              : {}
          mergedIntroElementStyles[targetId] = { ...prevTarget, ...(incoming as Record<string, unknown>) }
        }
      }
      log("intro element styles merged", { targets: Object.keys(mergedIntroElementStyles) })
    }

    const navContentPatch = existingNavigation?._id
      ? buildNavigationContentPatch(payload.nodes, {
          brandName: existingNavigation.brandName,
          links: existingNavigation.links,
          ctaLabel: existingNavigation.ctaLabel,
          ctaHref: existingNavigation.ctaHref,
        })
      : {}
    const navImagePatch: Record<string, unknown> = {}
    const navLogoNode = payload.nodes.find((node) => node.id === "nav-logo")
    if (navLogoNode?.explicitContent) {
      const src = typeof navLogoNode.content?.src === "string" ? navLogoNode.content.src.trim() : ""
      if (!src) {
        skippedNodes.push("nav-logo:missing-content-src")
      } else if (!isImageSrcPersistable(src)) {
        skippedNodes.push("nav-logo:src(blob/data url)")
      } else {
        const imageField = buildSanityImageFieldFromSrc(src, projectId, dataset)
        if (!imageField) {
          skippedNodes.push("nav-logo:src(non-sanity-cdn url)")
        } else {
          navImagePatch.brandLogo = imageField
          if (!persistedFields.includes("brandLogo")) persistedFields.push("brandLogo")
          if (!persistedNodes.includes("nav-logo")) persistedNodes.push("nav-logo")
        }
      }
    }

    const hasNavLayout =
      mergedNavigationElementStyles !== null && Object.keys(mergedNavigationElementStyles).length > 0
    const hasNavContent = Object.keys(navContentPatch).length > 0 || Object.keys(navImagePatch).length > 0

    let navigationDocumentId: string | null = null
    if (existingNavigation?._id && (hasNavLayout || hasNavContent)) {
      const setPayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (hasNavLayout) setPayload.elementStyles = mergedNavigationElementStyles
      Object.assign(setPayload, navContentPatch)
      Object.assign(setPayload, navImagePatch)
      const navPatchResponse = await writeClient.patch(toPublishedDocumentId(existingNavigation._id)).set(setPayload).commit()
      navigationDocumentId = navPatchResponse._id
      log("navigation patch committed", { docId: navigationDocumentId, hasNavLayout, hasNavContent })
      const navParts: string[] = []
      if (hasNavLayout) navParts.push("layout")
      if (hasNavContent) navParts.push("content")
      steps.push({
        step: "saving",
        ok: true,
        message: `Navigation ${navParts.join(" + ")} saved: ${existingNavigation._id}`,
      })
      if (hasNavContent) {
        for (const node of payload.nodes) {
          if (!node.explicitContent) continue
          if (
            node.id === "nav-brand-name" ||
            node.id === "nav-logo" ||
            node.id === "nav-book-button" ||
            node.id === "nav-mobile-book-button" ||
            /^nav-(link|mobile-link)-\d+$/.test(node.id)
          ) {
            if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
          }
        }
        for (const k of Object.keys(navContentPatch)) {
          if (!persistedFields.includes(k)) persistedFields.push(k)
        }
      }
    }

    const introContentResult: { patch: Record<string, unknown>; skipped: string[] } = existingIntro?._id
      ? buildIntroContentPatch(payload.nodes)
      : { patch: {}, skipped: [] }
    const introContentPatch = introContentResult.patch
    log("[INTRO-TRACE][route][introContentPatch]", introContentPatch)
    log("[INTRO-TRACE][route][introElementStylesInPayload]", introElementStylesInPayload)
    const hasIntroLayout =
      mergedIntroElementStyles !== null && Object.keys(mergedIntroElementStyles).length > 0
    const hasIntroContent = Object.keys(introContentPatch).length > 0
    log("[INTRO-TRACE][route][mergedIntroElementStyles]", mergedIntroElementStyles)

    let introDocumentId: string | null = null
    if (existingIntro?._id && (hasIntroLayout || hasIntroContent)) {
      const introSetPayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (hasIntroLayout) introSetPayload.elementStyles = mergedIntroElementStyles
      Object.assign(introSetPayload, introContentPatch)
      log("[INTRO-TRACE][route][introSetPayload-before-commit]", introSetPayload)
      const introPatchResponse = await writeClient.patch(toPublishedDocumentId(existingIntro._id)).set(introSetPayload).commit()
      introDocumentId = introPatchResponse._id
      log("intro patch committed", { docId: introDocumentId, hasIntroLayout, hasIntroContent })
      log("[INTRO-TRACE][route][introPatchResponse]", introPatchResponse)
      const introParts: string[] = []
      if (hasIntroLayout) introParts.push("layout")
      if (hasIntroContent) introParts.push("content")
      steps.push({
        step: "saving",
        ok: true,
        message: `Intro banner ${introParts.join(" + ")} saved: ${existingIntro._id}`,
      })
      if (hasIntroContent) {
        for (const node of payload.nodes) {
          if (!node.explicitContent) continue
          if (
            node.id === "intro-banner-text" ||
            node.id === "intro-banner-gif" ||
            node.id === "intro-book-button" ||
            node.id === "intro-press-button"
          ) {
            if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
          }
        }
        for (const k of Object.keys(introContentPatch)) {
          if (!persistedFields.includes(k)) persistedFields.push(k)
        }
      }

      const introReadback = await writeClient.fetch<{
        _id: string
        gifUrl?: string
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(
        `*[_type == $introType][0]{ _id, gifUrl, elementStyles }`,
        { introType: SANITY_DOC_INTRO }
      )
      log("[INTRO-TRACE][route][introReadback-after-commit]", {
        docId: introReadback?._id || null,
        gifUrl: introReadback?.gifUrl || null,
        gifStyle: introReadback?.elementStyles?.["intro-banner-gif"] || null,
        textStyle: introReadback?.elementStyles?.["intro-banner-text"] || null,
        bookStyle: introReadback?.elementStyles?.["intro-book-button"] || null,
        pressStyle: introReadback?.elementStyles?.["intro-press-button"] || null,
      })
    }
    if (!existingIntro?._id && (hasIntroLayout || hasIntroContent)) {
      const introCreatePayload: Record<string, unknown> & { _id: string; _type: string } = {
        _id: INTRO_DOCUMENT_ID,
        _type: SANITY_DOC_INTRO,
        updatedAt: new Date().toISOString(),
      }
      if (hasIntroLayout) introCreatePayload.elementStyles = mergedIntroElementStyles
      Object.assign(introCreatePayload, introContentPatch)
      log("[INTRO-TRACE][route][introCreatePayload-before-commit]", introCreatePayload)
      const introCreateResponse = await writeClient.createOrReplace(introCreatePayload)
      introDocumentId = introCreateResponse._id
      log("[INTRO-TRACE][route][introCreateResponse]", introCreateResponse)
      steps.push({
        step: "saving",
        ok: true,
        message: `Intro banner document created: ${introDocumentId}`,
      })

      const introReadback = await writeClient.fetch<{
        _id: string
        gifUrl?: string
        elementStyles?: Record<string, Record<string, unknown>>
      } | null>(
        `*[_type == $introType][0]{ _id, gifUrl, elementStyles }`,
        { introType: SANITY_DOC_INTRO }
      )
      log("[INTRO-TRACE][route][introReadback-after-create]", {
        docId: introReadback?._id || null,
        gifUrl: introReadback?.gifUrl || null,
        gifStyle: introReadback?.elementStyles?.["intro-banner-gif"] || null,
        textStyle: introReadback?.elementStyles?.["intro-banner-text"] || null,
        bookStyle: introReadback?.elementStyles?.["intro-book-button"] || null,
        pressStyle: introReadback?.elementStyles?.["intro-press-button"] || null,
      })
    }

    if (introContentResult.skipped.length > 0) {
      skippedFields.push(...introContentResult.skipped)
      if (!skippedNodes.includes("intro-banner-gif")) skippedNodes.push("intro-banner-gif")
    }

    let homeEditorStateDocumentId: string | null = null
    if (Array.isArray(payload.nodes) && payload.nodes.length > 0) {
      const homeStateDocument = {
        _id: HOME_EDITOR_STATE_DOCUMENT_ID,
        _type: SANITY_DOC_HOME_EDITOR_STATE,
        updatedAt: new Date().toISOString(),
        nodesJson: JSON.stringify(payload.nodes),
      }
      const homeStateResponse = await writeClient.createOrReplace(homeStateDocument)
      homeEditorStateDocumentId = homeStateResponse._id
      steps.push({
        step: "saving",
        ok: true,
        message: `Home editor central state saved: ${HOME_EDITOR_STATE_DOCUMENT_ID} (${payload.nodes.length} nodes).`,
      })
      persistedFields.push("homeEditorState.nodesJson")
      for (const node of payload.nodes) {
        if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
      }
    }

    // Process Hero element style overrides (position, size, typography)
    if (Object.keys(payload.heroElementStyles || {}).length > 0 || Object.keys(elementStylesInPayload).length > 0) {
      const elementStyles = payload.heroElementStyles || {}
      
      log("element styles received", { 
        targetCount: Object.keys(elementStyles).length,
        targets: Object.keys(elementStyles)
      })
      
      // Merge element styles into patch
      const heroElementStyles: Record<string, unknown> = { ...elementStylesInPayload, ...elementStyles }
      for (const [targetId, styles] of Object.entries(elementStyles)) {
        if (typeof styles === 'object' && styles !== null) {
          heroElementStyles[targetId] = styles
          persistedFields.push(`elementStyle:${targetId}`)
          persistedNodes.push(targetId)
        }
      }
      
      if (Object.keys(heroElementStyles).length > 0) {
        const priorRaw = existingHero?.elementStyles
        const prior =
          priorRaw && typeof priorRaw === "object" && !Array.isArray(priorRaw)
            ? { ...priorRaw }
            : {}
        const merged: Record<string, unknown> = { ...prior }
        for (const [targetId, incoming] of Object.entries(heroElementStyles)) {
          if (typeof incoming === "object" && incoming !== null) {
            const prevTarget =
              merged[targetId] && typeof merged[targetId] === "object"
                ? (merged[targetId] as Record<string, unknown>)
                : {}
            merged[targetId] = { ...prevTarget, ...(incoming as Record<string, unknown>) }
          }
        }
        heroPatch.elementStyles = merged
        log("element styles patch", { styleCount: Object.keys(merged), mergedTargets: Object.keys(merged) })
      }
    }

    if (Object.keys(heroPatch).length > 0) {
      log("patch apply", { fields: Object.keys(heroPatch), willValidate: true })
      
      // Perform patch
      const patchResponse = await writeClient
        .patch(toPublishedDocumentId(existingHero._id))
        .set({ ...heroPatch, updatedAt: new Date().toISOString() })
        .commit()
      log("patch committed", { docId: patchResponse._id, modified: new Date(patchResponse._updatedAt) })
      
      // Fetch published perspective to verify
      const readClient = createClient({
        projectId,
        dataset,
        apiVersion: "2024-01-01",
        useCdn: false,
        token: sanityToken,
        perspective: "published",
      })
      const verifyQuery = `*[_type == $type][0]{ title, titleHighlight }`
      const verified = await readClient.fetch<{ title?: string; titleHighlight?: string } | null>(
        verifyQuery,
        { type: SANITY_DOC_TYPE }
      )

      log("post-patch verification", {
        title: { sent: heroPatch.title, read: verified?.title, match: verified?.title === heroPatch.title },
        titleHighlight: { sent: heroPatch.titleHighlight, read: verified?.titleHighlight, match: verified?.titleHighlight === heroPatch.titleHighlight }
      })

      // Validation: check critical fields
      const titleOk = !heroPatch.title || verified?.title === heroPatch.title
      const highlightOk = !heroPatch.titleHighlight || verified?.titleHighlight === heroPatch.titleHighlight
      const segmentsOk = true  // No longer validating legacy titleSegments
      
      if (!titleOk || !highlightOk || !segmentsOk) {
        log("validation failed", { titleOk, highlightOk, segmentsOk })
        steps.push({ step: "saving", ok: false, message: `Write verification failed: title=${titleOk}, highlight=${highlightOk}, segments=${segmentsOk}` })
        const errorResponse = {
          status: "failed",
          ok: false,
          step: "saving",
          message: "Deploy failed: data verification failed after write",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: existingHero._id,
          publishedDocumentType: SANITY_DOC_TYPE,
          targetSection: TARGET_SECTION,
          heroTitleMode,
          revalidatedPath: REVALIDATED_PATH,
          persistedNodes,
          skippedNodes,
          failedNodes: [...failedNodes, "write-verification"],
          persistedFields,
          skippedFields,
          diagnostics,
          envDiagnostics,
        }
        log("returning error response", { status: errorResponse.status, ok: errorResponse.ok })
        return NextResponse.json(errorResponse, { status: 500 })
      }
      
      log("validation passed", { fields: Object.keys(heroPatch) })
      steps.push({ step: "saving", ok: true, message: `Hero section patched and verified: ${existingHero._id}` })
    } else {
      log("no patch needed", { reason: "no persistible changes" })
      steps.push({ step: "saving", ok: true, message: "No persistible Hero content changes detected; no patch applied." })
    }

    const publishedDocumentId = existingHero._id
    let localRevalidateOk = false
    if (SHOULD_REVALIDATE_PATH) {
      log("revalidate path", { path: REVALIDATED_PATH })
      revalidatePath(REVALIDATED_PATH)
      steps.push({ step: "revalidating", ok: true, message: "Local Next.js cache revalidated for '/'." })
      localRevalidateOk = true
    } else {
      log("revalidate path skipped", { path: REVALIDATED_PATH })
      steps.push({ step: "revalidating", ok: true, message: "Revalidation skipped in local editor mode." })
    }

    const publicRevalidate = await triggerPublicRevalidate(log)
    if (publicRevalidate.attempted) {
      steps.push({
        step: "revalidating",
        ok: publicRevalidate.ok,
        message: publicRevalidate.message,
      })
    }
    const vercelDeploy = await triggerVercelDeploy(log)
    if (vercelDeploy.attempted) {
      steps.push({
        step: "publishing",
        ok: vercelDeploy.ok,
        message: vercelDeploy.message,
      })
    }

    // Changed-node read-back verification (persisted means verified on read, not just attempted write).
    const [heroReadback, navReadback, introReadback, homeStateReadback] = await Promise.all([
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        title?: string
        titleHighlight?: string
        subtitle?: string
        backgroundImage?: { asset?: { _ref?: string; _id?: string } }
        logo?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $type][0]{ title, titleHighlight, subtitle, elementStyles, backgroundImage{asset->{_id}}, logo{asset->{_id}} }`,
        { type: SANITY_DOC_TYPE }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        brandName?: string
        links?: Array<{ label?: string; href?: string }>
        ctaLabel?: string
        ctaHref?: string
        brandLogo?: { asset?: { _ref?: string; _id?: string } }
      } | null>(
        `*[_type == $type][0]{ elementStyles, brandName, links[]{label, href}, ctaLabel, ctaHref, brandLogo{asset->{_id}} }`,
        { type: SANITY_DOC_NAV }
      ),
      writeClient.fetch<{
        elementStyles?: Record<string, Record<string, unknown>>
        bannerText?: string
        gifUrl?: string
        bookLabel?: string
        bookHref?: string
        pressLabel?: string
        pressHref?: string
      } | null>(
        `*[_type == $type][0]{ elementStyles, bannerText, gifUrl, bookLabel, bookHref, pressLabel, pressHref }`,
        { type: SANITY_DOC_INTRO }
      ),
      writeClient.fetch<{ nodesJson?: string } | null>(
        `*[_type == $homeType && _id == $homeId][0]{ nodesJson }`,
        { homeType: SANITY_DOC_HOME_EDITOR_STATE, homeId: HOME_EDITOR_STATE_DOCUMENT_ID }
      ),
    ])

    const changedNodesPersisted: string[] = []
    const changedNodesSkipped: string[] = []
    const changedNodesFailed: string[] = []
    const verificationByNodeId: Record<string, NodeVerificationResult> = {}

    for (const nodeId of changedNodeIds) {
      const node = payloadNodeById.get(nodeId)
      if (!node) {
        const mismatchReason = "missing-payload-node"
        changedNodesFailed.push(nodeId)
        if (!failedNodes.includes(`${nodeId}:${mismatchReason}`)) failedNodes.push(`${nodeId}:${mismatchReason}`)
        verificationByNodeId[nodeId] = {
          storageTarget: "unknown",
          expected: {},
          readBack: null,
          matched: false,
          mismatchReason,
        }
        continue
      }

      const failedMarker = getNodeFailureMarker(nodeId, failedNodes)
      if (failedMarker) {
        changedNodesFailed.push(nodeId)
        verificationByNodeId[nodeId] = {
          storageTarget: "unknown",
          expected: {},
          readBack: null,
          matched: false,
          mismatchReason: failedMarker,
        }
        continue
      }

      const skippedMarker = getNodeFailureMarker(nodeId, skippedNodes)
      if (skippedMarker) {
        changedNodesSkipped.push(nodeId)
        verificationByNodeId[nodeId] = {
          storageTarget: "unknown",
          expected: {},
          readBack: null,
          matched: false,
          mismatchReason: skippedMarker,
        }
        continue
      }

      const expected: Record<string, unknown> = {}
      const readBack: Record<string, unknown> = {}
      let storageTarget = "unknown"

      const writeStyleKeys = new Set<string>()
      if (node.explicitStyle) {
        for (const [key, value] of Object.entries(node.style || {})) {
          if (value !== undefined && value !== null) writeStyleKeys.add(key)
        }
      }
      const writeContentKeys = new Set<string>()
      if (node.explicitContent) {
        for (const [key, value] of Object.entries(node.content || {})) {
          if (value !== undefined && value !== null) writeContentKeys.add(key)
        }
      }

      const isHeroLayoutId =
        nodeId === "hero-section" ||
        nodeId === "hero-bg-image" ||
        nodeId === "hero-title-main" ||
        nodeId === "hero-title-accent" ||
        nodeId === "hero-subtitle" ||
        nodeId === "hero-logo" ||
        nodeId === "hero-scroll-indicator" ||
        nodeId === "hero-buttons"
      const isNavLayoutIdChanged = isNavLayoutId(nodeId)
      const isIntroLayoutIdChanged = INTRO_LAYOUT_IDS.has(nodeId)
      const shouldVerifyHomeState = shouldVerifyInHomeEditorState(node)

      const expectedScale =
        node.explicitStyle && typeof node.style.scale === "number"
          ? Math.round(node.style.scale * 1000) / 1000
          : undefined

      if (nodeId === "hero-title-main" && node.explicitContent) {
        storageTarget = "heroSection.fields"
        const expectedText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        expected.title = expectedText
        readBack.title = heroReadback?.title
      } else if (nodeId === "hero-title-accent" && node.explicitContent) {
        storageTarget = "heroSection.fields"
        const expectedText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        expected.titleHighlight = expectedText
        readBack.titleHighlight = heroReadback?.titleHighlight
      } else if (nodeId === "hero-subtitle" && node.explicitContent) {
        storageTarget = "heroSection.fields"
        const expectedText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        expected.subtitle = expectedText
        readBack.subtitle = heroReadback?.subtitle
      } else if (nodeId === "hero-bg-image" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "heroSection.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.backgroundImageRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.backgroundImageRef = heroReadback?.backgroundImage?.asset?._ref ?? heroReadback?.backgroundImage?.asset?._id
      } else if (nodeId === "hero-logo" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "heroSection.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.logoRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.logoRef = heroReadback?.logo?.asset?._ref ?? heroReadback?.logo?.asset?._id
      } else if (isHeroLayoutId && (node.explicitPosition || node.explicitSize || expectedScale !== undefined)) {
        storageTarget = "heroSection.elementStyles"
        const heroStyle = heroReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (heroStyle as Record<string, unknown>).x
          readBack.y = (heroStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (heroStyle as Record<string, unknown>).width
          readBack.height = (heroStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (heroStyle as Record<string, unknown>).scale
        }
      } else if (isNavLayoutIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined)) {
        storageTarget = "navigation.elementStyles"
        const navStyle = navReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (navStyle as Record<string, unknown>).x
          readBack.y = (navStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (navStyle as Record<string, unknown>).width
          readBack.height = (navStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (navStyle as Record<string, unknown>).scale
        }
      } else if (nodeId === "nav-brand-name" && node.explicitContent) {
        storageTarget = "navigation.fields"
        expected.brandName = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.brandName = navReadback?.brandName
      } else if (/^nav-(?:mobile-)?link-\d+$/.test(nodeId) && node.explicitContent) {
        storageTarget = "navigation.fields"
        const match = /^nav-(?:mobile-)?link-(\d+)$/.exec(nodeId)
        const linkIndex = match ? Number(match[1]) : -1
        const navLink = linkIndex >= 0 ? navReadback?.links?.[linkIndex] : undefined
        if (writeContentKeys.has("text")) {
          expected[`links[${linkIndex}].label`] = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack[`links[${linkIndex}].label`] = navLink?.label
        }
        if (writeContentKeys.has("href")) {
          expected[`links[${linkIndex}].href`] = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack[`links[${linkIndex}].href`] = navLink?.href
        }
      } else if ((nodeId === "nav-book-button" || nodeId === "nav-mobile-book-button") && node.explicitContent) {
        storageTarget = "navigation.fields"
        if (writeContentKeys.has("text")) {
          expected.ctaLabel = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.ctaLabel = navReadback?.ctaLabel
        }
        if (writeContentKeys.has("href")) {
          expected.ctaHref = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack.ctaHref = navReadback?.ctaHref
        }
      } else if (nodeId === "nav-logo" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "navigation.fields"
        const src = typeof node.content.src === "string" ? node.content.src.trim() : ""
        expected.brandLogoRef = parseSanityImageRefFromUrl(src, projectId, dataset)
        readBack.brandLogoRef = navReadback?.brandLogo?.asset?._ref ?? navReadback?.brandLogo?.asset?._id
      } else if (isIntroLayoutIdChanged && (node.explicitPosition || node.explicitSize || expectedScale !== undefined || node.explicitStyle)) {
        storageTarget = "introBanner.elementStyles"
        const introStyle = introReadback?.elementStyles?.[nodeId] || {}
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = (introStyle as Record<string, unknown>).x
          readBack.y = (introStyle as Record<string, unknown>).y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = (introStyle as Record<string, unknown>).width
          readBack.height = (introStyle as Record<string, unknown>).height
        }
        if (expectedScale !== undefined) {
          expected.scale = expectedScale
          readBack.scale = (introStyle as Record<string, unknown>).scale
        }
        if (node.explicitStyle) {
          if (writeStyleKeys.has("color")) {
            expected.color = node.style.color
            readBack.color = (introStyle as Record<string, unknown>).color
          }
          if (writeStyleKeys.has("fontSize")) {
            expected.fontSize = parsePxNumber(node.style.fontSize)
            readBack.fontSize = (introStyle as Record<string, unknown>).fontSize
          }
          if (writeStyleKeys.has("fontWeight")) {
            const fw = node.style.fontWeight
            const parsedFw = typeof fw === "number" ? fw : (typeof fw === "string" ? parseInt(fw, 10) : undefined)
            expected.fontWeight = Number.isNaN(parsedFw as number) ? undefined : parsedFw
            readBack.fontWeight = (introStyle as Record<string, unknown>).fontWeight
          }
        }
      } else if (nodeId === "intro-banner-text" && node.explicitContent) {
        storageTarget = "introBanner.fields"
        expected.bannerText = typeof node.content.text === "string" ? node.content.text.trim() : ""
        readBack.bannerText = introReadback?.bannerText
      } else if (nodeId === "intro-banner-gif" && node.explicitContent && writeContentKeys.has("src")) {
        storageTarget = "introBanner.fields"
        expected.gifUrl = typeof node.content.src === "string" ? node.content.src.trim() : ""
        readBack.gifUrl = introReadback?.gifUrl
      } else if (nodeId === "intro-book-button" && node.explicitContent) {
        storageTarget = "introBanner.fields"
        if (writeContentKeys.has("text")) {
          expected.bookLabel = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.bookLabel = introReadback?.bookLabel
        }
        if (writeContentKeys.has("href")) {
          expected.bookHref = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack.bookHref = introReadback?.bookHref
        }
      } else if (nodeId === "intro-press-button" && node.explicitContent) {
        storageTarget = "introBanner.fields"
        if (writeContentKeys.has("text")) {
          expected.pressLabel = typeof node.content.text === "string" ? node.content.text.trim() : ""
          readBack.pressLabel = introReadback?.pressLabel
        }
        if (writeContentKeys.has("href")) {
          expected.pressHref = typeof node.content.href === "string" ? node.content.href.trim() : ""
          readBack.pressHref = introReadback?.pressHref
        }
      } else if (shouldVerifyHomeState) {
        storageTarget = "homeEditorState.nodesJson"
        const homeStateNodes = (() => {
          try {
            const parsed = JSON.parse(homeStateReadback?.nodesJson || "[]")
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })() as Array<HomeEditorNodeOverride & { id?: string }>

        const readNode = homeStateNodes.find((n) => {
          const withNodeId = n as HomeEditorNodeOverride & { id?: string }
          return withNodeId.nodeId === nodeId || withNodeId.id === nodeId
        })
        if (!readNode) {
          changedNodesFailed.push(nodeId)
          const mismatchReason = "missing-home-editor-state-node"
          if (!failedNodes.includes(`${nodeId}:${mismatchReason}`)) failedNodes.push(`${nodeId}:${mismatchReason}`)
          verificationByNodeId[nodeId] = {
            storageTarget,
            expected: {},
            readBack: null,
            matched: false,
            mismatchReason,
          }
          continue
        }
        if (node.explicitPosition) {
          expected.x = roundLayoutPx(node.geometry.x)
          expected.y = roundLayoutPx(node.geometry.y)
          readBack.x = readNode.geometry?.x
          readBack.y = readNode.geometry?.y
        }
        if (node.explicitSize) {
          expected.width = roundLayoutPx(node.geometry.width)
          expected.height = roundLayoutPx(node.geometry.height)
          readBack.width = readNode.geometry?.width
          readBack.height = readNode.geometry?.height
        }
        if (node.explicitStyle) {
          for (const key of writeStyleKeys) {
            expected[`style.${key}`] = normalizeComparableValue(node.style[key as keyof DeployNodePayload["style"]])
            readBack[`style.${key}`] = normalizeComparableValue(readNode.style?.[key as keyof HomeEditorNodeOverride["style"]])
          }
        }
        if (node.explicitContent) {
          for (const key of writeContentKeys) {
            expected[`content.${key}`] = normalizeComparableValue(node.content[key as keyof DeployNodePayload["content"]])
            readBack[`content.${key}`] = normalizeComparableValue(readNode.content?.[key as keyof HomeEditorNodeOverride["content"]])
          }
        }
        expected.explicitContent = node.explicitContent
        expected.explicitStyle = node.explicitStyle
        expected.explicitPosition = node.explicitPosition
        expected.explicitSize = node.explicitSize
        readBack.explicitContent = readNode.explicitContent
        readBack.explicitStyle = readNode.explicitStyle
        readBack.explicitPosition = readNode.explicitPosition
        readBack.explicitSize = readNode.explicitSize
      } else {
        storageTarget = "unknown"
        expected.persistedMarker = true
        readBack.persistedMarker = persistedNodes.some((m) => markerMatchesNode(m, nodeId))
      }

      const comparison = compareMaps(expected, readBack)
      verificationByNodeId[nodeId] = {
        storageTarget,
        expected,
        readBack: Object.keys(readBack).length > 0 ? readBack : null,
        matched: comparison.matched,
        mismatchReason: comparison.mismatchReason,
      }

      if (comparison.matched) {
        changedNodesPersisted.push(nodeId)
      } else {
        changedNodesFailed.push(nodeId)
        const reason = comparison.mismatchReason || "readback-mismatch"
        if (!failedNodes.includes(`${nodeId}:${reason}`)) failedNodes.push(`${nodeId}:${reason}`)
      }
    }

    const heroPatched = Object.keys(heroPatch).length > 0
    const navPatched = navigationDocumentId != null
    const introPatched = introDocumentId != null
    const homeStatePatched = homeEditorStateDocumentId != null
    const publicPropagationConfigured = !!PUBLIC_REVALIDATE_URL || !!VERCEL_DEPLOY_HOOK
    const publicPropagationOk = publicRevalidate.ok || vercelDeploy.ok
    const hasPersistenceIssues = failedNodes.length > 0 || skippedNodes.length > 0 || changedNodesFailed.length > 0
    const parts: string[] = []
    if (heroPatched) parts.push("Hero")
    if (navPatched) parts.push("Navigation")
    if (introPatched) parts.push("Intro banner")
    if (homeStatePatched) parts.push("Home editor state")
    const baseMessage = parts.length > 0
      ? `${parts.join(", ")} updated in Sanity`
      : "No persistible changes detected"
    let deployMessage: string
    if (hasPersistenceIssues) {
      deployMessage = `Deploy partial: ${baseMessage}; ${failedNodes.length} failed node(s), ${skippedNodes.length} skipped node(s).`
    } else if (!publicPropagationConfigured) {
      deployMessage = `Deploy complete: ${baseMessage}; local cache revalidated, but external public propagation is not configured.`
    } else if (!publicPropagationOk) {
      deployMessage = `Deploy complete: ${baseMessage}; external propagation was attempted but did not succeed.`
    } else {
      deployMessage = `Deploy complete: ${baseMessage}; external public propagation triggered.`
    }

    const successResponse = {
      status: hasPersistenceIssues ? "partial" : "ok",
      ok: true,
      step: "done",
      message: deployMessage,
      steps,
      routeVersion: ROUTE_VERSION,
      sanityDocumentId: publishedDocumentId,
      publishedDocumentId,
      publishedDocumentType: SANITY_DOC_TYPE,
      navigationDocumentId: navigationDocumentId ?? undefined,
      introDocumentId: introDocumentId ?? undefined,
      homeEditorStateDocumentId: homeEditorStateDocumentId ?? undefined,
      targetSection: TARGET_SECTION,
      heroTitleMode,
      revalidatedPath: REVALIDATED_PATH,
      localRevalidateEnabled: SHOULD_REVALIDATE_PATH,
      localRevalidateOk,
      publicRevalidateAttempted: publicRevalidate.attempted,
      publicRevalidateOk: publicRevalidate.ok,
      publicRevalidateMessage: publicRevalidate.message,
      publicRevalidateUrlConfigured: !!PUBLIC_REVALIDATE_URL,
      vercelDeployAttempted: vercelDeploy.attempted,
      vercelDeployOk: vercelDeploy.ok,
      vercelDeployMessage: vercelDeploy.message,
      vercelDeployHookConfigured: !!VERCEL_DEPLOY_HOOK,
      publicPropagationConfigured,
      publicPropagationOk,
      changedNodeIds,
      changedNodesPersisted,
      changedNodesSkipped,
      changedNodesFailed,
      verificationByNodeId,
      persistedNodes,
      skippedNodes,
      failedNodes,
      persistedFields,
      skippedFields,
      diagnostics,
      envDiagnostics,
    }
    log("returning success response", { status: successResponse.status, ok: successResponse.ok })
    return NextResponse.json(successResponse, { status: 200 })
  } catch (error) {
    const elapsed = Date.now() - startTime
    const diagnostics = getEnvDiagnostics()
    const envDiagnostics = diagnostics
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`[editor-deploy ${elapsed}ms] exception:`, message, error)
    return NextResponse.json(
      {
        status: "failed",
        ok: false,
        step: "saving",
        message: `Deploy failed with exception: ${message}`,
        routeVersion: ROUTE_VERSION,
        publishedDocumentId: "resolved-at-deploy",
        publishedDocumentType: SANITY_DOC_TYPE,
        targetSection: TARGET_SECTION,
        heroTitleMode: "unknown",
        revalidatedPath: REVALIDATED_PATH,
        persistedNodes: [],
        skippedNodes: [],
        failedNodes: ["exception"],
        diagnostics,
        envDiagnostics,
      },
      { status: 500 }
    )
  }
}
