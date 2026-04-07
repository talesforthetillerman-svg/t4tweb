import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

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
  findings: Array<{ element: string; issue: string; severity: "green" | "yellow" | "red"; blocks: boolean }>
  nodes: DeployNodePayload[]
}

interface DeployStepResult {
  step: "checking" | "saving" | "creating_branch" | "committing" | "creating_pr"
  ok: boolean
  message: string
}

const PAYLOAD_FILE = "public/data/editor-deploy-state.json"
const EDITOR_BRANCH = "editor-deploy"

async function githubRequest<T>(url: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "t4t-editor-deploy",
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

async function githubRequestAllow404<T>(url: string, init: RequestInit, token: string): Promise<{ status: number; data?: T; text?: string }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "t4t-editor-deploy",
      ...(init.headers || {}),
    },
  })

  if (response.status === 404) {
    return { status: 404 }
  }
  if (!response.ok) {
    const text = await response.text()
    return { status: response.status, text }
  }

  const data = (await response.json()) as T
  return { status: response.status, data }
}

async function runGithubFlow(content: string): Promise<{
  prUrl: string | null
  steps: DeployStepResult[]
  error?: string
}> {
  const steps: DeployStepResult[] = []
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const baseBranch = process.env.GITHUB_BASE_BRANCH || "main"

  if (!token) {
    steps.push({ step: "creating_branch", ok: false, message: "GITHUB_TOKEN missing." })
    return {
      prUrl: null,
      steps,
      error: "Deploy incomplete: changes were saved locally, but PR could not be created because GITHUB_TOKEN is missing.",
    }
  }
  if (!repo) {
    steps.push({ step: "creating_branch", ok: false, message: "GITHUB_REPO missing." })
    return {
      prUrl: null,
      steps,
      error: "Deploy incomplete: changes were saved locally, but PR could not be created because GITHUB_REPO is missing.",
    }
  }

  const [owner, repoName] = repo.split("/")
  if (!owner || !repoName) {
    steps.push({ step: "creating_branch", ok: false, message: "GITHUB_REPO must be owner/repo." })
    return {
      prUrl: null,
      steps,
      error: "Deploy incomplete: GITHUB_REPO must use owner/repo format.",
    }
  }

  try {
    const pulls = await githubRequest<Array<{ number: number; html_url: string }>>(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?state=open&head=${owner}:${EDITOR_BRANCH}&base=${baseBranch}`,
      { method: "GET" },
      token
    )

    if (pulls.length > 0) {
      const existingPr = pulls[0]
      const prFiles = await githubRequest<Array<{ filename: string }>>(
        `https://api.github.com/repos/${owner}/${repoName}/pulls/${existingPr.number}/files`,
        { method: "GET" },
        token
      )
      const unexpectedFiles = prFiles
        .map((f) => f.filename)
        .filter((name) => name !== PAYLOAD_FILE)

      if (unexpectedFiles.length > 0) {
        steps.push({
          step: "creating_branch",
          ok: false,
          message: `Conflict in code file, manual review required: ${unexpectedFiles.join(", ")}`,
        })
        return {
          prUrl: existingPr.html_url,
          steps,
          error: `Conflict in code file, manual review required: ${unexpectedFiles.join(", ")}`,
        }
      }
    }
  } catch (error) {
    steps.push({
      step: "creating_branch",
      ok: false,
      message: error instanceof Error ? error.message : "Failed to inspect existing PR state.",
    })
    return {
      prUrl: null,
      steps,
      error: `Failed at create_branch: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }

  try {
    const baseRef = await githubRequest<{ object?: { sha?: string } }>(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${baseBranch}`,
      { method: "GET" },
      token
    )
    const baseSha = baseRef.object?.sha
    if (!baseSha) throw new Error("Could not resolve base branch SHA")

    const existingBranch = await githubRequestAllow404<{ ref: string }>(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${EDITOR_BRANCH}`,
      { method: "GET" },
      token
    )

    if (existingBranch.status === 404) {
      await githubRequest(
        `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: `refs/heads/${EDITOR_BRANCH}`, sha: baseSha }),
        },
        token
      )
      steps.push({ step: "creating_branch", ok: true, message: `Branch created: ${EDITOR_BRANCH}` })
    } else if (existingBranch.status >= 400) {
      throw new Error(existingBranch.text || "Failed to inspect editor-deploy branch")
    } else {
      await githubRequest(
        `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${EDITOR_BRANCH}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha: baseSha, force: true }),
        },
        token
      )
      steps.push({ step: "creating_branch", ok: true, message: `Branch updated from ${baseBranch}: ${EDITOR_BRANCH}` })
    }
  } catch (error) {
    steps.push({ step: "creating_branch", ok: false, message: error instanceof Error ? error.message : "Unknown branch creation error." })
    return {
      prUrl: null,
      steps,
      error: `Failed at create_branch: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }

  try {
    const existingContent = await githubRequestAllow404<{ sha: string }>(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${PAYLOAD_FILE}?ref=${EDITOR_BRANCH}`,
      { method: "GET" },
      token
    )

    await githubRequest(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${PAYLOAD_FILE}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "chore(editor): persist visual editor deploy state",
          content: Buffer.from(content, "utf8").toString("base64"),
          branch: EDITOR_BRANCH,
          ...(existingContent.status === 200 && existingContent.data?.sha
            ? { sha: existingContent.data.sha }
            : {}),
        }),
      },
      token
    )
    steps.push({ step: "committing", ok: true, message: "Editor payload committed." })
  } catch (error) {
    steps.push({ step: "committing", ok: false, message: error instanceof Error ? error.message : "Unknown commit error." })
    return {
      prUrl: null,
      steps,
      error: `Failed at committing: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }

  try {
    const pulls = await githubRequest<Array<{ number: number; html_url: string }>>(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?state=open&head=${owner}:${EDITOR_BRANCH}&base=${baseBranch}`,
      { method: "GET" },
      token
    )

    if (pulls.length > 0) {
      const existingPr = pulls[0]
      steps.push({ step: "creating_pr", ok: true, message: `PR reused: ${existingPr.html_url}` })
      return { prUrl: existingPr.html_url, steps }
    }

    const createdPr = await githubRequest<{ html_url?: string }>(
      `https://api.github.com/repos/${owner}/${repoName}/pulls`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Editor deploy: persist visual changes",
          head: EDITOR_BRANCH,
          base: baseBranch,
          body: "Automated editor deploy payload on fixed editor-deploy branch. GitHub Actions checks will run on this PR.",
        }),
      },
      token
    )

    const prUrl = createdPr.html_url || null
    if (!prUrl) {
      steps.push({ step: "creating_pr", ok: false, message: "PR API returned without html_url." })
      return { prUrl: null, steps, error: "Failed at create_pr: GitHub did not return PR URL." }
    }

    steps.push({ step: "creating_pr", ok: true, message: `PR created: ${prUrl}` })
    return { prUrl, steps }
  } catch (error) {
    steps.push({ step: "creating_pr", ok: false, message: error instanceof Error ? error.message : "Unknown PR error." })
    return {
      prUrl: null,
      steps,
      error: `Failed at create_pr: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function POST(request: Request) {
  try {
    const steps: DeployStepResult[] = [{ step: "checking", ok: true, message: "Payload received." }]
    const payload = (await request.json()) as DeployRequestPayload

    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.findings) || !payload.level) {
      return NextResponse.json({ message: "Invalid deploy payload." }, { status: 400 })
    }
    if (payload.nodes.length === 0) {
      return NextResponse.json({ message: "Invalid deploy payload: nodes array is empty." }, { status: 400 })
    }
    if (payload.level === "red") {
      return NextResponse.json({ message: "Deploy blocked by red pre-check findings." }, { status: 400 })
    }

    const persistable = {
      createdAt: new Date().toISOString(),
      source: "visual-editor",
      level: payload.level,
      findings: payload.findings,
      nodes: payload.nodes,
    }
    const serialized = JSON.stringify(persistable, null, 2)

    const outputDir = path.join(process.cwd(), "public", "data")
    await mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, "editor-deploy-state.json")
    await writeFile(outputPath, serialized, "utf8")
    steps.push({ step: "saving", ok: true, message: "State persisted locally to public/data/editor-deploy-state.json." })

    const githubResult = await runGithubFlow(serialized)
    const mergedSteps = steps.concat(githubResult.steps)

    if (githubResult.prUrl && !githubResult.error) {
      return NextResponse.json({
        status: "ok",
        mode: "complete",
        step: "done",
        localSaved: true,
        remoteReady: true,
        message: "Branch updated, editor payload committed, and PR ready.",
        prUrl: githubResult.prUrl,
        steps: mergedSteps,
      })
    }

    const failedStep = mergedSteps.find((s) => !s.ok)?.step || "creating_pr"
    return NextResponse.json({
      status: "incomplete",
      mode: "incomplete",
      step: failedStep,
      localSaved: true,
      remoteReady: false,
      message:
        githubResult.error ||
        "Deploy incomplete: changes were saved locally, but branch/commit/PR could not be completed.",
      prUrl: githubResult.prUrl,
      steps: mergedSteps,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Editor deploy route failed." },
      { status: 500 }
    )
  }
}
