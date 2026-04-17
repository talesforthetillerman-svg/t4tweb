import { NextRequest, NextResponse } from "next/server"

/**
 * Upload an image to Sanity Assets and return the Sanity CDN URL
 * Used by /editor when user selects a file for hero-logo, hero-bg-image, nav-logo, etc.
 *
 * Request: FormData with file and metadata
 * Response: { url: "https://cdn.sanity.io/..." } or error
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    console.log("[editor-upload-asset] POST request started")
    const formData = await request.formData()
    const file = formData.get("file") as File
    const nodeId = formData.get("nodeId") as string

    console.log("[editor-upload-asset] FormData parsed", {
      hasFile: !!file,
      filename: file?.name,
      size: file?.size,
      type: file?.type,
      nodeId
    })

    if (!file) {
      console.error("[editor-upload-asset] Missing file in formData")
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const dataset = process.env.SANITY_DATASET || "production"
    const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

    console.log("[editor-upload-asset] Config check", {
      hasProjectId: !!projectId,
      hasDataset: !!dataset,
      hasToken: !!token,
      projectId: projectId?.substring(0, 20)
    })

    if (!projectId || !token) {
      console.error("[editor-upload-asset] Missing Sanity config", { projectId: !!projectId, token: !!token })
      return NextResponse.json({ error: "Missing Sanity config" }, { status: 500 })
    }

    // Upload to Sanity Assets
    const buffer = await file.arrayBuffer()
    const uploadResponse = await fetch(
      `https://${projectId}.api.sanity.io/v1/assets/images/${dataset}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
        },
        body: buffer,
      }
    )

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text()
      console.error(
        `[editor-upload-asset] Sanity upload failed for ${nodeId}:`,
        error
      )
      return NextResponse.json(
        { error: `Sanity upload failed: ${uploadResponse.statusText}` },
        { status: 500 }
      )
    }

    let uploadedAsset: unknown
    try {
      uploadedAsset = await uploadResponse.json()
    } catch (parseErr) {
      const text = await uploadResponse.text()
      console.error("[editor-upload-asset] Failed to parse Sanity JSON response:", {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        responseText: text.substring(0, 200)
      })
      return NextResponse.json(
        { error: "Invalid JSON in Sanity response" },
        { status: 500 }
      )
    }

    const uploadedAssetAny = uploadedAsset as any
    console.log("[editor-upload-asset] Sanity response parsed:", {
      full: JSON.stringify(uploadedAsset).substring(0, 500),
      hasDocument: !!uploadedAssetAny?.document,
      documentKeys: uploadedAssetAny?.document ? Object.keys(uploadedAssetAny.document) : null,
      hasUrl: !!uploadedAssetAny?.document?.url,
      url: uploadedAssetAny?.document?.url?.toString().substring(0, 100)
    })

    const assetUrl = uploadedAssetAny?.document?.url

    if (!assetUrl || typeof assetUrl !== "string") {
      console.error(
        `[editor-upload-asset] No valid URL in Sanity response for ${nodeId}`,
        {
          uploadedAsset: JSON.stringify(uploadedAsset).substring(0, 200),
          assetUrl,
          assetUrlType: typeof assetUrl
        }
      )
      return NextResponse.json(
        { error: "No valid asset URL in response", received: uploadedAsset },
        { status: 500 }
      )
    }

    const elapsed = Date.now() - startTime
    console.log(`[editor-upload-asset] Success for ${nodeId}:`, {
      filename: file.name,
      size: file.size,
      url: assetUrl.substring(0, 100),
      elapsed,
    })

    return NextResponse.json({ url: assetUrl }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[editor-upload-asset] Exception:", message, error)
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    )
  }
}
