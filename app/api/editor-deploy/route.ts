import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "next-sanity"

interface DeployNodePayload {
  id: string
  type: string
  label: string
  isGrouped: boolean
  geometry: { x: number; y: number; width: number; height: number }
  style: Record<string, unknown>
  content: Record<string, unknown>
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
const REVALIDATED_PATH = "/"

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
    const heroLogoNode = payload.nodes.find((node) => node.id === "hero-logo")
    const heroScrollNode = payload.nodes.find((node) => node.id === "hero-scroll-indicator")

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
      perspective: "drafts",
    })

    const existingHero = await writeClient.fetch<{ _id: string; title?: string; titleHighlight?: string; titleSegments?: HeroTitleSegment[] } | null>(
      `*[_type == $type][0]{ _id, title, titleHighlight, titleSegments }`,
      { type: SANITY_DOC_TYPE }
    )
    log("document fetch", { found: !!existingHero?._id, docId: existingHero?._id })
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
    } else if (heroTitleNode && (heroTitleNode.explicitPosition || heroTitleNode.explicitSize || heroTitleNode.explicitStyle)) {
      skippedFields.push("titlePositionOrStyle")
      skippedNodes.push("hero-title-position-or-style")
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
    } else if (heroSubtitleNode?.explicitPosition || heroSubtitleNode?.explicitSize || heroSubtitleNode?.explicitStyle) {
      skippedFields.push("subtitlePositionOrStyle")
      skippedNodes.push("hero-subtitle-position-or-style")
    }

    if (heroLogoNode && (heroLogoNode.explicitPosition || heroLogoNode.explicitSize)) {
      // Capture hero-logo position and size
      if (!elementStylesInPayload) elementStylesInPayload = {}
      elementStylesInPayload["hero-logo"] = elementStylesInPayload["hero-logo"] || {}
      const logoStyles = elementStylesInPayload["hero-logo"] as Record<string, unknown>
      
      if (heroLogoNode.explicitPosition) {
        logoStyles.x = heroLogoNode.geometry.x
        logoStyles.y = heroLogoNode.geometry.y
        log("hero-logo position captured", { x: logoStyles.x, y: logoStyles.y })
      }
      if (heroLogoNode.explicitSize) {
        logoStyles.width = heroLogoNode.geometry.width
        logoStyles.height = heroLogoNode.geometry.height
        log("hero-logo size captured", { width: logoStyles.width, height: logoStyles.height })
      }
      
      persistedFields.push("hero-logo-position-size")
      persistedNodes.push("hero-logo")
    } else if (heroLogoNode && heroLogoNode.explicitContent) {
      skippedFields.push("hero-logo")
    }
    if (heroScrollNode && (heroScrollNode.explicitContent || heroScrollNode.explicitPosition || heroScrollNode.explicitSize || heroScrollNode.explicitStyle)) {
      skippedFields.push("hero-scroll-indicator")
      skippedNodes.push("hero-scroll-indicator")
    }

    const positionOnlyEdits = payload.nodes.some((node) => node.explicitPosition || node.explicitSize)
    if (positionOnlyEdits) {
      skippedFields.push("hero-layout")
      skippedNodes.push("hero-layout")
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
        heroPatch.elementStyles = heroElementStyles
        log("element styles patch", { styleCount: Object.keys(heroElementStyles).length })
      }
    }

    if (Object.keys(heroPatch).length > 0) {
      log("patch apply", { fields: Object.keys(heroPatch), willValidate: true })
      
      // Perform patch
      const patchResponse = await writeClient.patch(existingHero._id).set({ ...heroPatch, updatedAt: new Date().toISOString() }).commit()
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
      
      // Normalize and compare titleSegments (only render-relevant fields)
      const normalizedPayloadSegments = heroPatch.titleSegments 
        ? normalizeTitleSegments(heroPatch.titleSegments as unknown[])
        : []
      const normalizedFetchedSegments = verified?.titleSegments 
        ? normalizeTitleSegments(verified.titleSegments)
        : []
      const segmentsOk = JSON.stringify(normalizedPayloadSegments) === JSON.stringify(normalizedFetchedSegments)
      
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

    const successResponse = {
      status: "ok",
      ok: true,
      step: "done",
      message: "Deploy complete: Hero section updated in Sanity and public path revalidated.",
      steps,
      routeVersion: ROUTE_VERSION,
      sanityDocumentId: publishedDocumentId,
      publishedDocumentId,
      publishedDocumentType: SANITY_DOC_TYPE,
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
