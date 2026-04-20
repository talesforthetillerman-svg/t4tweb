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
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
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

async function initCleanHeroSubtitle() {
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

  console.log("🚀 Initializing clean hero-subtitle state...")

  try {
    // Read existing homeEditorState
    const doc = await client.fetch(`*[_id == "homeEditorState-singleton"][0]{ nodesJson }`)
    
    let nodes: HomeEditorNodeOverride[] = []
    
    if (doc?.nodesJson) {
      nodes = JSON.parse(doc.nodesJson)
      if (!Array.isArray(nodes)) {
        console.log("❌ nodesJson is not an array")
        return
      }
      console.log(`📊 Found ${nodes.length} existing nodes`)
    } else {
      console.log("📝 No existing homeEditorState, creating new one")
    }

    // Remove any existing hero-subtitle
    const filteredNodes = nodes.filter((node: any) => {
      const nodeId = node.nodeId || node.id
      return nodeId !== "hero-subtitle"
    })

    const removedCount = nodes.length - filteredNodes.length
    if (removedCount > 0) {
      console.log(`🗑️ Removed ${removedCount} old hero-subtitle node(s)`)
    }

    // Create clean hero-subtitle node
    const cleanHeroSubtitle: HomeEditorNodeOverride = {
      nodeId: "hero-subtitle",
      nodeType: "text",
      geometry: {
        x: 0,  // Start at origin
        y: 0,  // Start at origin  
        width: 0,  // Will be calculated from content
        height: 0,  // Will be calculated from content
      },
      style: {
        textAlign: "center",  // Default centered
        // No scale - using fontSize instead
        gradientEnabled: true,
        gradientStart: "#FFB15A",
        gradientEnd: "#FF6C00",
      },
      content: {
        text: "INDIE FOLK • SINGER-SONGWRITER • STORYTELLER",  // Default text
      },
      explicitContent: false,  // Start with default content
      explicitStyle: false,    // Start with default style
      explicitPosition: false, // Start with no explicit position
      explicitSize: false,     // Start with no explicit size
      updatedAt: new Date().toISOString(),
    }

    // Add the clean node
    const updatedNodes = [...filteredNodes, cleanHeroSubtitle]
    
    console.log("✨ Created clean hero-subtitle node:")
    console.log(`   - Geometry: x=${cleanHeroSubtitle.geometry.x}, y=${cleanHeroSubtitle.geometry.y}`)
    console.log(`   - TextAlign: ${cleanHeroSubtitle.style.textAlign}`)
    console.log(`   - Gradient: ${cleanHeroSubtitle.style.gradientEnabled ? "enabled" : "disabled"}`)
    console.log(`   - Explicit position: ${cleanHeroSubtitle.explicitPosition}`)
    console.log(`   - Explicit size: ${cleanHeroSubtitle.explicitSize}`)

    // Update the document
    await client.createOrReplace({
      _id: "homeEditorState-singleton",
      _type: "homeEditorState",
      updatedAt: new Date().toISOString(),
      nodesJson: JSON.stringify(updatedNodes),
    })
    
    console.log("✅ Clean hero-subtitle initialized successfully")
    console.log(`📈 Total nodes: ${updatedNodes.length}`)

  } catch (error) {
    console.error("❌ Error initializing clean hero-subtitle:", error)
    process.exit(1)
  }
}

initCleanHeroSubtitle()