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

interface GithubRefResponse {
  object?: { sha?: string }
}

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

async function createGithubPr(content: string): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const baseBranch = process.env.GITHUB_BASE_BRANCH || "main"
  if (!token || !repo) return null

  const [owner, repoName] = repo.split("/")
  if (!owner || !repoName) throw new Error("GITHUB_REPO must be owner/repo")

  const refData = await githubRequest<GithubRefResponse>(
    `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${baseBranch}`,
    { method: "GET" },
    token
  )
  const baseSha = refData.object?.sha
  if (!baseSha) throw new Error("Could not resolve base branch SHA")

  const branchName = `editor-deploy-${Date.now()}`
  await githubRequest(
    `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    },
    token
  )

  await githubRequest(
    `https://api.github.com/repos/${owner}/${repoName}/contents/public/data/editor-deploy-state.json`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "chore(editor): persist visual editor deploy state",
        content: Buffer.from(content, "utf8").toString("base64"),
        branch: branchName,
      }),
    },
    token
  )

  const pr = await githubRequest<{ html_url?: string }>(
    `https://api.github.com/repos/${owner}/${repoName}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Editor deploy: persist visual changes",
        head: branchName,
        base: baseBranch,
        body: "Automated editor deploy payload. GitHub Actions checks will run on this PR.",
      }),
    },
    token
  )

  return pr.html_url || null
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DeployRequestPayload

    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.findings) || !payload.level) {
      return NextResponse.json({ message: "Invalid deploy payload." }, { status: 400 })
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

    const prUrl = await createGithubPr(serialized)
    if (prUrl) {
      return NextResponse.json({
        status: "ok",
        message: "Editor state persisted and PR created. GitHub Actions will run checks on the PR.",
        prUrl,
      })
    }

    return NextResponse.json({
      status: "ok",
      message:
        "Editor state persisted to public/data/editor-deploy-state.json. Set GITHUB_TOKEN and GITHUB_REPO to auto-create PRs.",
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Editor deploy route failed." },
      { status: 500 }
    )
  }
}
