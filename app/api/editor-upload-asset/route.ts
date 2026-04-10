import { NextResponse } from "next/server"
import { createClient } from "next-sanity"

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
])

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024 // 12MB

interface UploadResponse {
  assetId: string
  url: string
  mimeType: string
  width?: number
  height?: number
  originalFilename?: string
}

export async function POST(request: Request) {
  try {
    const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
    const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

    if (!projectId) {
      return NextResponse.json({ message: "Missing Sanity project id." }, { status: 500 })
    }
    if (!token) {
      return NextResponse.json({ message: "Missing Sanity write token for asset upload." }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded." }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ message: `Unsupported file type: ${file.type}` }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "File too large. Max size is 12MB." }, { status: 400 })
    }

    const writeClient = createClient({
      projectId,
      dataset,
      apiVersion: "2024-01-01",
      useCdn: false,
      token,
      perspective: "published",
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await writeClient.assets.upload("image", buffer, {
      filename: file.name,
      contentType: file.type,
      extract: ["palette", "location"],
    })

    const response: UploadResponse = {
      assetId: uploaded._id,
      url: uploaded.url,
      mimeType: uploaded.mimeType || file.type,
      originalFilename: uploaded.originalFilename || file.name,
      width: uploaded.metadata?.dimensions?.width,
      height: uploaded.metadata?.dimensions?.height,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error"
    return NextResponse.json({ message: `Asset upload failed: ${message}` }, { status: 500 })
  }
}
