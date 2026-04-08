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
  heroElementStyles?: Record<string, Record<string, unknown>> // { [targetId]: { text?, color?, fontSize?, x?, y?, ... } }
}

interface DeployStepResult {
  step: "checking" | "saving" | "publishing" | "revalidating"
  ok: boolean
  message: string
}

interface DeployEnvDiagnostics {
  SANITY_PROJECT_ID: "yes" | "no"
  NEXT_PUBLIC_SANITY_PROJECT_ID: "yes" | "no"
  SANITY_DATASET: "yes" | "no"
  SANITY_API_WRITE_TOKEN: "yes" | "no"
  SANITY_API_TOKEN: "yes" | "no"
}

const ROUTE_VERSION = "sanity-debug-v3-brutal"
const TARGET_SECTION = "hero"
const SANITY_DOC_TYPE = "heroSection"
const SANITY_DOC_NAV = "navigation"
const SANITY_DOC_INTRO = "introBanner"
const SANITY_DOC_HOME_EDITOR_STATE = "homeEditorState"
const HOME_EDITOR_STATE_DOCUMENT_ID = "homeEditorState"
const REVALIDATED_PATH = "/"

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

function isImageSrcPersistable(src: string): boolean {
  const value = src.trim()
  if (!value) return false
  if (value.startsWith("blob:") || value.startsWith("data:") || value.startsWith("javascript:")) return false
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return true
  return false
}

function shouldPersistInCentralHomeState(node: DeployNodePayload): boolean {
  const isImageLikeNode = node.type === "image" || node.type === "background"
  if (isImageLikeNode && node.explicitContent) return true
  if (HERO_NODE_IDS.has(node.id)) return false
  if (isNavLayoutId(node.id)) return false
  if (INTRO_NODE_IDS.has(node.id)) return false
  return node.explicitContent || node.explicitStyle || node.explicitPosition || node.explicitSize
}

function buildHomeEditorStateNode(node: DeployNodePayload): { node: HomeEditorNodeOverride; skippedImageSrc: boolean } {
  const skippedImageSrc = typeof node.content?.src === "string" && !!node.content.src && !isImageSrcPersistable(node.content.src)

  const content: HomeEditorNodeOverride["content"] = {
    text: typeof node.content?.text === "string" ? node.content.text : undefined,
    href: typeof node.content?.href === "string" ? node.content.href : undefined,
    src: skippedImageSrc ? undefined : (typeof node.content?.src === "string" ? node.content.src : undefined),
    alt: typeof node.content?.alt === "string" ? node.content.alt : undefined,
    videoUrl: typeof node.content?.videoUrl === "string" ? node.content.videoUrl : undefined,
    mediaKind: node.content?.mediaKind === "video" ? "video" : "image",
  }

  return {
    node: {
      nodeId: node.id,
      nodeType: node.type as HomeEditorNodeOverride["nodeType"],
      geometry: {
        x: roundLayoutPx(node.geometry.x),
        y: roundLayoutPx(node.geometry.y),
        width: roundLayoutPx(node.geometry.width),
        height: roundLayoutPx(node.geometry.height),
      },
      style: {
        color: typeof node.style?.color === "string" ? node.style.color : undefined,
        backgroundColor: typeof node.style?.backgroundColor === "string" ? node.style.backgroundColor : undefined,
        opacity: typeof node.style?.opacity === "number" ? node.style.opacity : undefined,
        contrast: typeof node.style?.contrast === "number" ? node.style.contrast : undefined,
        saturation: typeof node.style?.saturation === "number" ? node.style.saturation : undefined,
        brightness: typeof node.style?.brightness === "number" ? node.style.brightness : undefined,
        negative: typeof node.style?.negative === "boolean" ? node.style.negative : undefined,
        fontSize: typeof node.style?.fontSize === "string" ? node.style.fontSize : undefined,
        fontFamily: typeof node.style?.fontFamily === "string" ? node.style.fontFamily : undefined,
        fontWeight: typeof node.style?.fontWeight === "string" ? node.style.fontWeight : undefined,
        fontStyle: typeof node.style?.fontStyle === "string" ? node.style.fontStyle : undefined,
        textDecoration: typeof node.style?.textDecoration === "string" ? node.style.textDecoration : undefined,
        scale: typeof node.style?.scale === "number" ? Math.round(node.style.scale * 1000) / 1000 : undefined,
        minHeight: typeof node.style?.minHeight === "string" ? node.style.minHeight : undefined,
        paddingTop: typeof node.style?.paddingTop === "string" ? node.style.paddingTop : undefined,
        paddingBottom: typeof node.style?.paddingBottom === "string" ? node.style.paddingBottom : undefined,
      },
      content,
      explicitContent: node.explicitContent,
      explicitStyle: node.explicitStyle,
      explicitPosition: node.explicitPosition,
      explicitSize: node.explicitSize,
      updatedAt: new Date().toISOString(),
    },
    skippedImageSrc,
  }
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
    SANITY_API_WRITE_TOKEN: sanityApiWriteToken ? "yes" : "no",
    SANITY_API_TOKEN: sanityApiToken ? "yes" : "no",
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
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
    const sanityProjectId = process.env.SANITY_PROJECT_ID
    const nextPublicSanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const projectId = sanityProjectId || nextPublicSanityProjectId
    const dataset = process.env.SANITY_DATASET || "production"
    const sanityApiWriteToken = process.env.SANITY_API_WRITE_TOKEN
    const sanityApiToken = process.env.SANITY_API_TOKEN
    const sanityToken = sanityApiWriteToken || sanityApiToken
    const diagnostics = getEnvDiagnostics()
    const envDiagnostics = diagnostics

    log("environment", { projectId: projectId ? "set" : "missing", dataset, writeToken: sanityToken ? "set" : "missing" })

    const heroTitleNode = payload.nodes.find((node) => node.id === "hero-title" && node.type === "text")
    const heroSubtitleNode = payload.nodes.find((node) => node.id === "hero-subtitle" && node.type === "text")
    const incomingSegments = Array.isArray(heroTitleNode?.content?.textSegments)
      ? (heroTitleNode.content.textSegments as HeroTitleSegment[])
      : []
    const validSegments = incomingSegments.filter((segment) => typeof segment?.text === "string" && segment.text.length > 0)
    const hasSegments = validSegments.length >= 2
    const hasPlainText = typeof heroTitleNode?.content?.text === "string" && heroTitleNode.content.text.trim().length > 0

    const steps: DeployStepResult[] = [{
      step: "checking",
      ok: true,
      message: "Endpoint reached: /api/editor-deploy.",
    }]

    steps.push({
      step: "checking",
      ok: true,
      message: `Env diagnostics (server-side): SANITY_PROJECT_ID: ${diagnostics.SANITY_PROJECT_ID}; NEXT_PUBLIC_SANITY_PROJECT_ID: ${diagnostics.NEXT_PUBLIC_SANITY_PROJECT_ID}; SANITY_DATASET: ${diagnostics.SANITY_DATASET}; SANITY_API_WRITE_TOKEN: ${diagnostics.SANITY_API_WRITE_TOKEN}; SANITY_API_TOKEN: ${diagnostics.SANITY_API_TOKEN}; dataset value used: ${dataset}.`,
    })

    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.findings) || !payload.level) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload"], diagnostics, envDiagnostics }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload: nodes array is empty.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload.nodes"], diagnostics, envDiagnostics }, { status: 400 })
    }

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

    const [existingHero, existingNavigation, existingIntro, existingHomeEditorState] = await Promise.all([
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
      writeClient.fetch<{ _id: string; nodes?: HomeEditorNodeOverride[] } | null>(
        `*[_type == $homeType && _id == $homeId][0]{ _id, nodes }`,
        { homeType: SANITY_DOC_HOME_EDITOR_STATE, homeId: HOME_EDITOR_STATE_DOCUMENT_ID }
      ),
    ])
    log("document fetch", { hero: !!existingHero?._id, navigation: !!existingNavigation?._id, intro: !!existingIntro?._id })
    const heroTitleMode: "legacy" | "segmented" = hasSegments || (Array.isArray(existingHero?.titleSegments) && existingHero.titleSegments.length > 0)
      ? "segmented"
      : "legacy"

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

    if (heroTitleNode?.explicitContent || hasSegments) {
      if (hasSegments && heroTitleMode === "segmented") {
        heroPatch.titleSegments = validSegments
        persistedFields.push("titleSegments")
        persistedNodes.push("hero-title")
        heroPatch.title = validSegments[0].text.trim()
        if (!persistedFields.includes("title")) persistedFields.push("title")
        persistedNodes.push("hero-title-main")
        heroPatch.titleHighlight = validSegments[1].text.trim()
        if (!persistedFields.includes("titleHighlight")) persistedFields.push("titleHighlight")
        persistedNodes.push("hero-title-accent")
      } else if (hasSegments && heroTitleMode === "legacy") {
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
        skippedFields.push("title")
        failedNodes.push("hero-title-empty")
        skippedNodes.push("hero-title")
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

    /** Persist layout (translate/scale/size) for every hero block the visual editor can move — same as logo/title. */
    const HERO_LAYOUT_IDS = new Set([
      "hero-section",
      "hero-bg-image",
      "hero-title",
      "hero-subtitle",
      "hero-logo",
      "hero-scroll-indicator",
      "hero-buttons",
    ])

    for (const node of payload.nodes) {
      if (!HERO_LAYOUT_IDS.has(node.id)) continue
      const scaleVal = (node.style as { scale?: number })?.scale
      const hasScale = node.explicitStyle && typeof scaleVal === "number"
      if (!node.explicitPosition && !node.explicitSize && !hasScale) continue

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
    if (Object.keys(introElementStylesInPayload).length > 0 && existingIntro?._id) {
      const priorRaw = existingIntro.elementStyles
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

    const hasNavLayout =
      mergedNavigationElementStyles !== null && Object.keys(mergedNavigationElementStyles).length > 0
    const hasNavContent = Object.keys(navContentPatch).length > 0

    let navigationDocumentId: string | null = null
    if (existingNavigation?._id && (hasNavLayout || hasNavContent)) {
      const setPayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (hasNavLayout) setPayload.elementStyles = mergedNavigationElementStyles
      Object.assign(setPayload, navContentPatch)
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
    const hasIntroLayout =
      mergedIntroElementStyles !== null && Object.keys(mergedIntroElementStyles).length > 0
    const hasIntroContent = Object.keys(introContentPatch).length > 0

    let introDocumentId: string | null = null
    if (existingIntro?._id && (hasIntroLayout || hasIntroContent)) {
      const introSetPayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (hasIntroLayout) introSetPayload.elementStyles = mergedIntroElementStyles
      Object.assign(introSetPayload, introContentPatch)
      const introPatchResponse = await writeClient.patch(toPublishedDocumentId(existingIntro._id)).set(introSetPayload).commit()
      introDocumentId = introPatchResponse._id
      log("intro patch committed", { docId: introDocumentId, hasIntroLayout, hasIntroContent })
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
    }

    if (introContentResult.skipped.length > 0) {
      skippedFields.push(...introContentResult.skipped)
      if (!skippedNodes.includes("intro-banner-gif")) skippedNodes.push("intro-banner-gif")
    }

    const centralHomeNodes: HomeEditorNodeOverride[] = []
    const skippedNodeDiagnostics: string[] = []
    for (const node of payload.nodes) {
      const isImageLikeNode = node.type === "image" || node.type === "background"
      if (isImageLikeNode && (node.explicitStyle || node.explicitPosition || node.explicitSize) && !node.explicitContent) {
        const reason = `${node.id}:explicitContent(false)-image-not-persisted`
        skippedNodeDiagnostics.push(reason)
        if (!skippedNodes.includes(node.id)) skippedNodes.push(node.id)
      }
      if (isImageLikeNode && node.explicitContent && (!node.content?.src || String(node.content.src).trim().length === 0)) {
        const reason = `${node.id}:missing-content-src`
        skippedNodeDiagnostics.push(reason)
        if (!skippedNodes.includes(node.id)) skippedNodes.push(node.id)
        if (!failedNodes.includes(reason)) failedNodes.push(reason)
        continue
      }
      if (!shouldPersistInCentralHomeState(node)) continue
      const built = buildHomeEditorStateNode(node)
      centralHomeNodes.push(built.node)
      if (built.skippedImageSrc) {
        skippedNodeDiagnostics.push(`${node.id}:src(blob/data url)`)
        if (!skippedNodes.includes(node.id)) skippedNodes.push(node.id)
      }
      if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
    }

    let homeEditorStateDocumentId: string | null = null
    if (centralHomeNodes.length > 0) {
      const existingNodes = Array.isArray(existingHomeEditorState?.nodes) ? existingHomeEditorState.nodes : []
      const mergedById = new Map<string, HomeEditorNodeOverride>()
      existingNodes.forEach((node) => {
        if (!node?.nodeId) return
        mergedById.set(node.nodeId, node)
      })
      centralHomeNodes.forEach((node) => {
        mergedById.set(node.nodeId, node)
      })
      const mergedNodes = Array.from(mergedById.values()).sort((a, b) => a.nodeId.localeCompare(b.nodeId))
      const homeStateDocument = {
        _id: HOME_EDITOR_STATE_DOCUMENT_ID,
        _type: SANITY_DOC_HOME_EDITOR_STATE,
        updatedAt: new Date().toISOString(),
        nodes: mergedNodes,
      }
      const homeStateResponse = await writeClient.createOrReplace(homeStateDocument)
      homeEditorStateDocumentId = homeStateResponse._id
      steps.push({
        step: "saving",
        ok: true,
        message: `Home editor central state saved: ${HOME_EDITOR_STATE_DOCUMENT_ID} (${mergedNodes.length} nodes).`,
      })
      persistedFields.push("homeEditorState.nodes")
      skippedFields.push(...skippedNodeDiagnostics)
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
      const verifyQuery = `*[_type == $type][0]{ title, titleHighlight, titleSegments[] }`
      const verified = await readClient.fetch<{ title?: string; titleHighlight?: string; titleSegments?: HeroTitleSegment[] } | null>(
        verifyQuery,
        { type: SANITY_DOC_TYPE }
      )
      const normalizedPayloadSegs = heroPatch.titleSegments 
        ? normalizeTitleSegments(heroPatch.titleSegments as unknown[])
        : []
      const normalizedFetchedSegs = verified?.titleSegments 
        ? normalizeTitleSegments(verified.titleSegments)
        : []
      
      log("post-patch verification", { 
        title: { sent: heroPatch.title, read: verified?.title, match: verified?.title === heroPatch.title },
        titleHighlight: { sent: heroPatch.titleHighlight, read: verified?.titleHighlight, match: verified?.titleHighlight === heroPatch.titleHighlight },
        segments: { 
          sentCount: Array.isArray(heroPatch.titleSegments) ? heroPatch.titleSegments.length : 0, 
          readCount: Array.isArray(verified?.titleSegments) ? verified.titleSegments.length : 0,
          normalizedPayload: normalizedPayloadSegs.slice(0, 1), // first segment only
          normalizedFetched: normalizedFetchedSegs.slice(0, 1)
        }
      })
      
      // Validation: check critical fields
      const titleOk = !heroPatch.title || verified?.title === heroPatch.title
      const highlightOk = !heroPatch.titleHighlight || verified?.titleHighlight === heroPatch.titleHighlight
      
      // Normalize and compare titleSegments only when this deploy patches segments.
      // Layout-only deploys (elementStyles / logo geometry) omit titleSegments; comparing
      // [] to existing CMS segments incorrectly failed verification and blocked revalidate.
      const normalizedPayloadSegments = heroPatch.titleSegments
        ? normalizeTitleSegments(heroPatch.titleSegments as unknown[])
        : []
      const normalizedFetchedSegments = verified?.titleSegments
        ? normalizeTitleSegments(verified.titleSegments)
        : []
      const segmentsTouched = Object.prototype.hasOwnProperty.call(heroPatch, "titleSegments")
      const segmentsOk = segmentsTouched
        ? JSON.stringify(normalizedPayloadSegments) === JSON.stringify(normalizedFetchedSegments)
        : true
      
      log("segments comparison", {
        payloadSegmentsCount: Array.isArray(heroPatch.titleSegments) ? heroPatch.titleSegments.length : 0,
        fetchedSegmentsCount: Array.isArray(verified?.titleSegments) ? verified.titleSegments.length : 0,
        normalizedPayloadSegments: normalizedPayloadSegments.slice(0, 2), // show first 2 for brevity
        normalizedFetchedSegments: normalizedFetchedSegments.slice(0, 2),
        segmentsOk
      })
      
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
    log("revalidate path", { path: REVALIDATED_PATH })
    revalidatePath(REVALIDATED_PATH)
    steps.push({ step: "revalidating", ok: true, message: "Public site revalidated." })

    const heroPatched = Object.keys(heroPatch).length > 0
    const navPatched = navigationDocumentId != null
    const introPatched = introDocumentId != null
    const homeStatePatched = homeEditorStateDocumentId != null
    const parts: string[] = []
    if (heroPatched) parts.push("Hero")
    if (navPatched) parts.push("Navigation")
    if (introPatched) parts.push("Intro banner")
    if (homeStatePatched) parts.push("Home editor state")
    let deployMessage = "Deploy complete: public path revalidated."
    if (parts.length > 0) {
      deployMessage = `Deploy complete: ${parts.join(", ")} updated in Sanity; public path revalidated.`
    }

    const successResponse = {
      status: "ok",
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
