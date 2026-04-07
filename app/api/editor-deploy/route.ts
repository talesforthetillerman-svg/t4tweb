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
  nextPublicSanityProjectIdDetected: "yes" | "no"
  sanityProjectIdDetected: "yes" | "no"
  sanityDatasetDetected: "yes" | "no"
  sanityApiWriteTokenDetected: "yes" | "no"
  sanityApiTokenDetected: "yes" | "no"
  projectIdSource: "SANITY_PROJECT_ID" | "NEXT_PUBLIC_SANITY_PROJECT_ID" | "none"
  tokenSource: "SANITY_API_WRITE_TOKEN" | "SANITY_API_TOKEN" | "none"
}

const SANITY_DOC_ID = "editorDeployPayload"
const SANITY_DRAFT_ID = `drafts.${SANITY_DOC_ID}`

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
    const diagnostics: DeployEnvDiagnostics = {
      nextPublicSanityProjectIdDetected: nextPublicSanityProjectId ? "yes" : "no",
      sanityProjectIdDetected: sanityProjectId ? "yes" : "no",
      sanityDatasetDetected: process.env.SANITY_DATASET ? "yes" : "no",
      sanityApiWriteTokenDetected: sanityApiWriteToken ? "yes" : "no",
      sanityApiTokenDetected: sanityApiToken ? "yes" : "no",
      projectIdSource: sanityProjectId ? "SANITY_PROJECT_ID" : nextPublicSanityProjectId ? "NEXT_PUBLIC_SANITY_PROJECT_ID" : "none",
      tokenSource: sanityApiWriteToken ? "SANITY_API_WRITE_TOKEN" : sanityApiToken ? "SANITY_API_TOKEN" : "none",
    }

    const steps: DeployStepResult[] = [{
      step: "checking",
      ok: true,
      message: payload?.diagnosticMode
        ? "Endpoint reached: /api/editor-deploy. Diagnostic deploy mode active."
        : "Endpoint reached: /api/editor-deploy.",
    }]

    steps.push({
      step: "checking",
      ok: true,
      message: `Env diagnostics (server-side): NEXT_PUBLIC_SANITY_PROJECT_ID detected: ${diagnostics.nextPublicSanityProjectIdDetected}; SANITY_PROJECT_ID detected: ${diagnostics.sanityProjectIdDetected}; SANITY_DATASET detected: ${diagnostics.sanityDatasetDetected}; SANITY_API_WRITE_TOKEN detected: ${diagnostics.sanityApiWriteTokenDetected}; SANITY_API_TOKEN detected: ${diagnostics.sanityApiTokenDetected}; projectId source: ${diagnostics.projectIdSource}; token source: ${diagnostics.tokenSource}; dataset value used: ${dataset}.`,
    })

    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.findings) || !payload.level) {
      return NextResponse.json({ message: "Invalid deploy payload.", diagnostics }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ message: "Invalid deploy payload: nodes array is empty.", diagnostics }, { status: 400 })
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
          diagnostics,
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
          diagnostics,
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
      _type: "editorDeployPayload",
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
          diagnostics,
        },
        { status: 500 }
      )
    }

    const { _id: _draftId, _rev, ...docForPublish } = draft
    await writeClient.transaction().createOrReplace({ ...docForPublish, _id: SANITY_DOC_ID }).delete(SANITY_DRAFT_ID).commit()
    steps.push({ step: "publishing", ok: true, message: "Sanity draft published successfully." })

    revalidatePath("/")
    steps.push({ step: "revalidating", ok: true, message: "Public site revalidated." })

    return NextResponse.json({
      status: "ok",
      mode: "complete",
      step: "done",
      localSaved: false,
      remoteReady: true,
      message: "Deploy complete: draft saved and published in Sanity.",
      steps,
      sanityDocumentId: SANITY_DOC_ID,
      diagnostics,
    })
  } catch (error) {
    const diagnostics: DeployEnvDiagnostics = {
      nextPublicSanityProjectIdDetected: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? "yes" : "no",
      sanityProjectIdDetected: process.env.SANITY_PROJECT_ID ? "yes" : "no",
      sanityDatasetDetected: process.env.SANITY_DATASET ? "yes" : "no",
      sanityApiWriteTokenDetected: process.env.SANITY_API_WRITE_TOKEN ? "yes" : "no",
      sanityApiTokenDetected: process.env.SANITY_API_TOKEN ? "yes" : "no",
      projectIdSource: process.env.SANITY_PROJECT_ID ? "SANITY_PROJECT_ID" : process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? "NEXT_PUBLIC_SANITY_PROJECT_ID" : "none",
      tokenSource: process.env.SANITY_API_WRITE_TOKEN ? "SANITY_API_WRITE_TOKEN" : process.env.SANITY_API_TOKEN ? "SANITY_API_TOKEN" : "none",
    }
    return NextResponse.json(
      {
        status: "failed",
        mode: "incomplete",
        step: "saving",
        message: error instanceof Error ? error.message : "Editor deploy route failed.",
        diagnostics,
      },
      { status: 500 }
    )
  }
}
