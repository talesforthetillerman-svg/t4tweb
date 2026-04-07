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
const SANITY_DOC_ID = "editorDeployPayload"
const SANITY_DRAFT_ID = `drafts.${SANITY_DOC_ID}`
const SANITY_DOC_TYPE = "editorDeployPayload"
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
    publishedDocumentId: SANITY_DOC_ID,
    publishedDocumentType: SANITY_DOC_TYPE,
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
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload.", publishedDocumentId: SANITY_DOC_ID, publishedDocumentType: SANITY_DOC_TYPE, revalidatedPath: REVALIDATED_PATH, diagnostics, envDiagnostics }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ routeVersion: ROUTE_VERSION, message: "Invalid deploy payload: nodes array is empty.", publishedDocumentId: SANITY_DOC_ID, publishedDocumentType: SANITY_DOC_TYPE, revalidatedPath: REVALIDATED_PATH, diagnostics, envDiagnostics }, { status: 400 })
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
          publishedDocumentId: SANITY_DOC_ID,
          publishedDocumentType: SANITY_DOC_TYPE,
          revalidatedPath: REVALIDATED_PATH,
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
          publishedDocumentId: SANITY_DOC_ID,
          publishedDocumentType: SANITY_DOC_TYPE,
          revalidatedPath: REVALIDATED_PATH,
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

    const persistable = {
      _id: SANITY_DRAFT_ID,
      _type: SANITY_DOC_TYPE,
      updatedAt: new Date().toISOString(),
      level: payload.level,
      findings: payload.findings,
      nodes: payload.nodes,
    }

    await writeClient.createOrReplace(persistable)
    steps.push({ step: "saving", ok: true, message: "Editor payload draft saved to Sanity." })

    const draft = await writeClient.getDocument(SANITY_DRAFT_ID)
    if (!draft) {
      steps.push({ step: "publishing", ok: false, message: "Sanity draft not found after save." })
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "publishing",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: could not publish because draft document was not found.",
          steps,
          routeVersion: ROUTE_VERSION,
          publishedDocumentId: SANITY_DOC_ID,
          publishedDocumentType: SANITY_DOC_TYPE,
          revalidatedPath: REVALIDATED_PATH,
          diagnostics,
          envDiagnostics,
        },
        { status: 500 }
      )
    }

    const { _id: _draftId, _rev, ...docForPublish } = draft
    await writeClient.transaction().createOrReplace({ ...docForPublish, _id: SANITY_DOC_ID }).delete(SANITY_DRAFT_ID).commit()
    steps.push({ step: "publishing", ok: true, message: "Sanity draft published successfully." })

    revalidatePath(REVALIDATED_PATH)
    steps.push({ step: "revalidating", ok: true, message: "Public site revalidated." })

    return NextResponse.json({
      status: "ok",
      mode: "complete",
      step: "done",
      localSaved: false,
      remoteReady: true,
      message: "Deploy complete: draft saved and published in Sanity.",
      steps,
      routeVersion: ROUTE_VERSION,
      sanityDocumentId: SANITY_DOC_ID,
      publishedDocumentId: SANITY_DOC_ID,
      publishedDocumentType: SANITY_DOC_TYPE,
      revalidatedPath: REVALIDATED_PATH,
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
        publishedDocumentId: SANITY_DOC_ID,
        publishedDocumentType: SANITY_DOC_TYPE,
        revalidatedPath: REVALIDATED_PATH,
        diagnostics,
        envDiagnostics,
      },
      { status: 500 }
    )
  }
}
