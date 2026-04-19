import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"

export interface PressKitData {
  pressKitTitle: string
  pressKitDescription: string
  pressKitButtonLabel: string
  pressKitButtonHref: string
  pressKitButtonFileName: string
  resources: Array<{
    title: string
    description: string
    assets: Array<{
      label: string
      url: string
      fileName: string
    }>
  }>
  managerTitle: string
  managerName: string
  managerRole: string
  managerEmail: string
  managerPhotoUrl: string
  backgroundImageUrl: string
  elementStyles: Record<string, Record<string, unknown>>
}

export const PRESS_KIT_FALLBACK: PressKitData = {
  pressKitTitle: "Complete Press Kit",
  pressKitDescription: "Download our full press kit including high quality photos, biography, technical rider, and more.",
  pressKitButtonLabel: "Press Kit",
  pressKitButtonHref: "/PressKit T40 2025.26_compressed.pdf",
  pressKitButtonFileName: "PressKit T40 2025.26_compressed.pdf",
  resources: [
    {
      title: "Band Logo",
      description: "High-resolution logo files",
      assets: [{ label: "Transparent logo", url: "/images/logo-transparent.png", fileName: "logo-transparent.png" }],
    },
    {
      title: "Press Photos",
      description: "Official high-res band photography",
      assets: [{ label: "Press photo", url: "/images/about-bg-main.jpg", fileName: "about-bg-main.jpg" }],
    },
  ],
  managerTitle: "Manager",
  managerName: "Momo Garcia",
  managerRole: "Band Management",
  managerEmail: "talesforthetillerman@gmail.com",
  managerPhotoUrl: "/images/Momo Garcia Manager.png",
  backgroundImageUrl: "/images/sections/press-bg.jpg",
  elementStyles: {},
}

function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://local.invalid")
    const last = parsed.pathname.split("/").filter(Boolean).pop()
    return last ? decodeURIComponent(last) : PRESS_KIT_FALLBACK.pressKitButtonFileName
  } catch {
    return PRESS_KIT_FALLBACK.pressKitButtonFileName
  }
}

export async function loadPressKitData(perspective: "published" | "drafts" = "published"): Promise<PressKitData> {
  try {
    const client = createClient({
      projectId: resolveSanityProjectId(),
      dataset: resolveSanityDataset(),
      apiVersion: "2024-01-01",
      useCdn: false,
      perspective,
    })

    const fetched = await client.fetch<{
      title?: string
      description?: string
      downloadButtonLabel?: string
      pressKitPdfUrl?: string
      pressKitPdfOriginalFilename?: string
      resources?: Array<{
        title?: string
        description?: string
        href?: string
        download?: boolean
        fileUrl?: string
        fileOriginalFilename?: string
        assets?: Array<{
          label?: string
          imageUrl?: string
          imageOriginalFilename?: string
        }>
      }>
      managerTitle?: string
      managerName?: string
      managerRole?: string
      managerEmail?: string
      managerPhotoUrl?: string
      backgroundImageUrl?: string
      elementStyles?: Record<string, Record<string, unknown>>
    } | null>(
      `*[_type == "pressKitSection"][0]{
        title,
        description,
        downloadButtonLabel,
        "pressKitPdfUrl": pressKitPdf.asset->url,
        "pressKitPdfOriginalFilename": pressKitPdf.asset->originalFilename,
        resources[]{
          title,
          description,
          href,
          download,
          "fileUrl": file.asset->url,
          "fileOriginalFilename": file.asset->originalFilename,
          assets[]{
            label,
            "imageUrl": image.asset->url,
            "imageOriginalFilename": image.asset->originalFilename
          }
        },
        managerTitle,
        managerName,
        managerRole,
        managerEmail,
        "managerPhotoUrl": managerPhoto.asset->url,
        "backgroundImageUrl": backgroundImage.asset->url,
        elementStyles
      }`
    )

    if (!fetched) return PRESS_KIT_FALLBACK
    const href = fetched.pressKitPdfUrl || PRESS_KIT_FALLBACK.pressKitButtonHref
    const resources = Array.isArray(fetched.resources) && fetched.resources.length > 0
      ? fetched.resources.slice(0, 2).map((resource, index) => {
        const fallback = PRESS_KIT_FALLBACK.resources[index] || PRESS_KIT_FALLBACK.resources[0]
        const hasPersistedAssetsField = Array.isArray(resource.assets)
        const assets = hasPersistedAssetsField
          ? resource.assets!.map((asset, assetIndex) => {
            const url = asset.imageUrl || ""
            return {
              label: asset.label || `Asset ${assetIndex + 1}`,
              url,
              fileName: asset.imageOriginalFilename || filenameFromUrl(url),
            }
          }).filter((asset) => asset.url)
          : resource.fileUrl || resource.href
            ? [{
              label: resource.title || fallback.title,
              url: resource.fileUrl || resource.href || "",
              fileName: resource.fileOriginalFilename || filenameFromUrl(resource.fileUrl || resource.href || ""),
            }]
            : fallback.assets
        return {
          title: resource.title || fallback.title,
          description: resource.description || fallback.description,
          assets,
        }
      })
      : PRESS_KIT_FALLBACK.resources
    while (resources.length < 2) {
      resources.push(PRESS_KIT_FALLBACK.resources[resources.length])
    }
    return {
      pressKitTitle: fetched.title || PRESS_KIT_FALLBACK.pressKitTitle,
      pressKitDescription: fetched.description || PRESS_KIT_FALLBACK.pressKitDescription,
      pressKitButtonLabel: fetched.downloadButtonLabel || PRESS_KIT_FALLBACK.pressKitButtonLabel,
      pressKitButtonHref: href,
      pressKitButtonFileName: fetched.pressKitPdfOriginalFilename || filenameFromUrl(href),
      resources,
      managerTitle: fetched.managerTitle || PRESS_KIT_FALLBACK.managerTitle,
      managerName: fetched.managerName || PRESS_KIT_FALLBACK.managerName,
      managerRole: fetched.managerRole || PRESS_KIT_FALLBACK.managerRole,
      managerEmail: fetched.managerEmail || PRESS_KIT_FALLBACK.managerEmail,
      managerPhotoUrl: fetched.managerPhotoUrl || PRESS_KIT_FALLBACK.managerPhotoUrl,
      backgroundImageUrl: fetched.backgroundImageUrl || PRESS_KIT_FALLBACK.backgroundImageUrl,
      elementStyles:
        fetched.elementStyles && typeof fetched.elementStyles === "object" && !Array.isArray(fetched.elementStyles)
          ? fetched.elementStyles
          : PRESS_KIT_FALLBACK.elementStyles,
    }
  } catch (error) {
    console.error("[loadPressKitData]", error)
    return PRESS_KIT_FALLBACK
  }
}
