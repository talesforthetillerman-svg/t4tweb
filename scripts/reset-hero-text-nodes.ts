#!/usr/bin/env tsx

import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"
import dotenv from "dotenv"
import path from "path"

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

interface HomeEditorNodeOverride {
  nodeId: string
  nodeType: string
  geometry: {
    x: number
    y: number
    width: number
    height: number
  }
  style: {
    color?: string
    fontSize?: string
    fontFamily?: string
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
    textAlign?: "left" | "center" | "right"
    scale?: number
    [key: string]: any
  }
  content: {
    text?: string
    [key: string]: any
  }
  explicitContent: boolean
  explicitStyle: boolean
  explicitPosition: boolean
  explicitSize: boolean
  updatedAt: string
}

async function resetHeroTextNodes() {
  const projectId = resolveSanityProjectId()
  const dataset = resolveSanityDataset()
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

  if (!token) {
    console.error("Missing SANITY_API_WRITE_TOKEN or SANITY_API_TOKEN")
    process.exit(1)
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
    token,
    perspective: "published",
  })

  console.log("Resetting Hero text nodes to new architecture...")

  try {
    // Read existing homeEditorState
    const doc = await client.fetch(`*[_id == "homeEditorState-singleton"][0]{ nodesJson }`)
    
    if (!doc?.nodesJson) {
      console.log("No homeEditorState document found or empty nodesJson")
      return
    }

    const nodes: HomeEditorNodeOverride[] = JSON.parse(doc.nodesJson)
    if (!Array.isArray(nodes)) {
      console.log("nodesJson is not an array")
      return
    }

    console.log(`Found ${nodes.length} nodes in homeEditorState`)

    let updated = false
    const updatedNodes = nodes.map((node) => {
      // Only process hero-title and hero-subtitle
      if (node.nodeId !== "hero-title" && node.nodeId !== "hero-subtitle") {
        return node
      }

      console.log(`Resetting node: ${node.nodeId}`)
      updated = true

      // Reset geometry to default (0, 0) but keep width/height if they exist
      const resetNode: HomeEditorNodeOverride = {
        ...node,
        geometry: {
          x: 0,
          y: 0,
          width: node.geometry?.width || 0,
          height: node.geometry?.height || 0,
        },
        style: {
          ...node.style,
          // Ensure textAlign is set (default to "center" for backward compatibility)
          textAlign: node.style?.textAlign || "center",
          // Remove scale if it exists (we'll use fontSize instead)
          scale: undefined,
        },
        explicitPosition: false, // Start with no explicit position
        explicitSize: false, // Start with no explicit size
        updatedAt: new Date().toISOString(),
      }

      // Clean up style object (remove undefined values)
      Object.keys(resetNode.style).forEach(key => {
        if (resetNode.style[key] === undefined) {
          delete resetNode.style[key]
        }
      })

      return resetNode
    })

    if (updated) {
      // Update the document
      await client.createOrReplace({
        _id: "homeEditorState-singleton",
        _type: "homeEditorState",
        updatedAt: new Date().toISOString(),
        nodesJson: JSON.stringify(updatedNodes),
      })
      console.log("✅ Hero text nodes reset successfully")
      console.log("Changes made:")
      updatedNodes.filter(n => n.nodeId === "hero-title" || n.nodeId === "hero-subtitle").forEach(n => {
        console.log(`  - ${n.nodeId}: geometry reset, textAlign=${n.style.textAlign}, scale removed`)
      })
    } else {
      console.log("✅ No Hero text nodes found to reset")
    }

  } catch (error) {
    console.error("Error resetting Hero text nodes:", error)
    process.exit(1)
  }
}

resetHeroTextNodes()