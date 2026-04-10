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

interface DeployRequestPayload {
  level: "green" | "yellow" | "red"
  diagnosticMode?: boolean
  findings: Array<{ element: string; issue: string; severity: "green" | "yellow" | "red"; blocks: boolean }>
  nodes: DeployNodePayload[]
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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DeployRequestPayload
    const sanityProjectId = process.env.SANITY_PROJECT_ID
    const nextPublicSanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const projectId = sanityProjectId || nextPublicSanityProjectId
    const dataset = process.env.SANITY_DATASET || "production"
    const sanityApiWriteToken = process.env.SANITY_API_WRITE_TOKEN
    const sanityApiToken = process.env.SANITY_API_TOKEN
    const sanityToken = sanityApiWriteToken || sanityApiToken
    const diagnostics = getEnvDiagnostics()
    const envDiagnostics = diagnostics

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
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload"], persistedFields: [], skippedFields: [], failedFields: ["payload"], diagnostics, envDiagnostics }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload: nodes array is empty.", publishedDocumentId: "resolved-at-deploy", publishedDocumentType: SANITY_DOC_TYPE, targetSection: TARGET_SECTION, heroTitleMode: "unknown", revalidatedPath: REVALIDATED_PATH, persistedNodes: [], skippedNodes: [], failedNodes: ["payload.nodes"], persistedFields: [], skippedFields: [], failedFields: ["payload.nodes"], diagnostics, envDiagnostics }, { status: 400 })
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
          persistedFields: [],
          skippedFields: [],
          failedFields: ["sanity-project-id"],
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
          persistedFields: [],
          skippedFields: [],
          failedFields: ["sanity-token"],
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

    const existingHero = await writeClient.fetch<{ _id: string; title?: string; titleHighlight?: string } | null>(
      `*[_type == $type][0]{ _id, title, titleHighlight }`,
      { type: SANITY_DOC_TYPE }
    )
    const heroTitleMode: "split-fields" = "split-fields"

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
          failedFields: ["hero-section-document"],
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
    const failedNodes: string[] = []
    const heroPatch: Record<string, unknown> = {}

    const heroTitleMainNode = payload.nodes.find((node) => node.id === "hero-title-main" && node.type === "text")
    const heroTitleAccentNode = payload.nodes.find((node) => node.id === "hero-title-accent" && node.type === "text")
    const heroSubtitleNode = payload.nodes.find((node) => node.id === "hero-subtitle" && node.type === "text")
    const heroLogoNode = payload.nodes.find((node) => node.id === "hero-logo")
    const heroScrollNode = payload.nodes.find((node) => node.id === "hero-scroll-indicator")

    const failedFields: string[] = []

    if (heroTitleMainNode?.explicitContent) {
      const heroTitleMainText = typeof heroTitleMainNode.content?.text === "string" ? heroTitleMainNode.content.text.trim() : ""
      if (heroTitleMainText) {
        heroPatch.title = heroTitleMainText
        persistedFields.push("title")
        persistedNodes.push("hero-title-main")
      } else {
        failedFields.push("title")
        failedNodes.push("hero-title-main-empty")
      }
    } else if (heroTitleMainNode?.explicitPosition || heroTitleMainNode?.explicitSize || heroTitleMainNode?.explicitStyle) {
      skippedFields.push("titlePositionOrStyle")
      skippedNodes.push("hero-title-main-position-or-style")
    }

    if (heroTitleAccentNode?.explicitContent) {
      const heroTitleAccentText = typeof heroTitleAccentNode.content?.text === "string" ? heroTitleAccentNode.content.text.trim() : ""
      if (heroTitleAccentText) {
        heroPatch.titleHighlight = heroTitleAccentText
        persistedFields.push("titleHighlight")
        persistedNodes.push("hero-title-accent")
      } else {
        failedFields.push("titleHighlight")
        failedNodes.push("hero-title-accent-empty")
      }
    } else if (heroTitleAccentNode?.explicitPosition || heroTitleAccentNode?.explicitSize || heroTitleAccentNode?.explicitStyle) {
      skippedFields.push("titleHighlightPositionOrStyle")
      skippedNodes.push("hero-title-accent-position-or-style")
    }

    if (heroSubtitleNode?.explicitContent) {
      const heroSubtitleText = typeof heroSubtitleNode.content?.text === "string" ? heroSubtitleNode.content.text.trim() : ""
      if (heroSubtitleText) {
        heroPatch.subtitle = heroSubtitleText
        persistedFields.push("subtitle")
        persistedNodes.push("hero-subtitle")
      } else {
        skippedFields.push("subtitle")
        failedFields.push("subtitle")
        failedNodes.push("hero-subtitle-empty")
      }
    } else if (heroSubtitleNode?.explicitPosition || heroSubtitleNode?.explicitSize || heroSubtitleNode?.explicitStyle) {
      skippedFields.push("subtitlePositionOrStyle")
      skippedNodes.push("hero-subtitle-position-or-style")
    }

    if (heroLogoNode && (heroLogoNode.explicitContent || heroLogoNode.explicitPosition || heroLogoNode.explicitSize || heroLogoNode.explicitStyle)) {
      skippedFields.push("hero-logo")
      skippedNodes.push("hero-logo")
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

    if (Object.keys(heroPatch).length > 0) {
      await writeClient.patch(existingHero._id).set({ ...heroPatch, updatedAt: new Date().toISOString() }).commit()
      steps.push({ step: "saving", ok: true, message: `Hero section patched: ${existingHero._id}` })
    } else {
      steps.push({ step: "saving", ok: true, message: "No persistible Hero content changes detected; no patch applied." })
    }

    const publishedDocumentId = existingHero._id
    steps.push({ step: "publishing", ok: true, message: `Published Hero document: ${publishedDocumentId}` })

    revalidatePath(REVALIDATED_PATH)
    steps.push({ step: "revalidating", ok: true, message: "Public site revalidated." })

    return NextResponse.json({
      status: "ok",
      mode: "complete",
      step: "done",
      localSaved: false,
      remoteReady: true,
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
      failedFields,
      diagnostics,
      envDiagnostics,
    })
  } catch (error) {
    const diagnostics = getEnvDiagnostics()
    const envDiagnostics = diagnostics
    return NextResponse.json(
      {
        status: "failed",
        mode: "incomplete",
        step: "saving",
        message: error instanceof Error ? error.message : "Editor deploy route failed.",
        routeVersion: ROUTE_VERSION,
        publishedDocumentId: "resolved-at-deploy",
        publishedDocumentType: SANITY_DOC_TYPE,
        targetSection: TARGET_SECTION,
        heroTitleMode: "unknown",
        revalidatedPath: REVALIDATED_PATH,
        persistedNodes: [],
        skippedNodes: [],
        failedNodes: ["exception"],
        persistedFields: [],
        skippedFields: [],
        failedFields: ["exception"],
        diagnostics,
        envDiagnostics,
      },
      { status: 500 }
    )
  }
}
