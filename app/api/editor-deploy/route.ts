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

const SANITY_DOC_ID = "editorDeployPayload"
const SANITY_DRAFT_ID = `drafts.${SANITY_DOC_ID}`

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DeployRequestPayload
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const dataset = process.env.SANITY_DATASET || "production"
    const sanityToken = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

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
      message: `Env diagnostics (server-side): SANITY_API_WRITE_TOKEN detected: ${sanityToken ? "yes" : "no"}, NEXT_PUBLIC_SANITY_PROJECT_ID detected: ${projectId ? "yes" : "no"}, SANITY_DATASET detected: ${process.env.SANITY_DATASET ? "yes" : "no"} (value used: ${dataset}).`,
    })

    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.findings) || !payload.level) {
      return NextResponse.json({ message: "Invalid deploy payload." }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ message: "Invalid deploy payload: nodes array is empty." }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json(
        {
          status: "failed",
          mode: "incomplete",
          step: "checking",
          localSaved: false,
          remoteReady: false,
          message: "Deploy failed: NEXT_PUBLIC_SANITY_PROJECT_ID missing.",
          steps,
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
          message: "Deploy failed: SANITY_API_WRITE_TOKEN missing.",
          steps,
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
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        mode: "incomplete",
        step: "saving",
        message: error instanceof Error ? error.message : "Editor deploy route failed.",
      },
      { status: 500 }
    )
  }
}
