#!/usr/bin/env tsx

import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"
import dotenv from "dotenv"
import path from "path"

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

async function cleanupHeroSubtitle() {
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

  console.log("🧹 Cleaning up hero-subtitle from homeEditorState...")

  try {
    // Read existing homeEditorState
    const doc = await client.fetch(`*[_id == "homeEditorState-singleton"][0]{ nodesJson }`)
    
    if (!doc?.nodesJson) {
      console.log("✅ No homeEditorState document found")
      return
    }

    const nodes = JSON.parse(doc.nodesJson)
    if (!Array.isArray(nodes)) {
      console.log("❌ nodesJson is not an array")
      return
    }

    console.log(`📊 Found ${nodes.length} total nodes in homeEditorState`)

    // Filter out hero-subtitle node
    const filteredNodes = nodes.filter((node: any) => {
      const nodeId = node.nodeId || node.id
      return nodeId !== "hero-subtitle"
    })

    const removedCount = nodes.length - filteredNodes.length
    
    if (removedCount > 0) {
      console.log(`🗑️ Removed ${removedCount} hero-subtitle node(s)`)
      
      // Update the document
      await client.createOrReplace({
        _id: "homeEditorState-singleton",
        _type: "homeEditorState",
        updatedAt: new Date().toISOString(),
        nodesJson: JSON.stringify(filteredNodes),
      })
      
      console.log("✅ homeEditorState updated successfully")
      
      // Show what was removed
      const removedNodes = nodes.filter((node: any) => {
        const nodeId = node.nodeId || node.id
        return nodeId === "hero-subtitle"
      })
      
      console.log("📋 Removed node details:")
      removedNodes.forEach((node: any, index: number) => {
        console.log(`  ${index + 1}. ${node.nodeId || node.id}`)
        console.log(`     Geometry: x=${node.geometry?.x}, y=${node.geometry?.y}, width=${node.geometry?.width}, height=${node.geometry?.height}`)
        console.log(`     Scale: ${node.style?.scale}`)
        console.log(`     TextAlign: ${node.style?.textAlign}`)
      })
    } else {
      console.log("✅ No hero-subtitle nodes found to remove")
    }

    // Also check for any hero-subtitle in elementStyles of hero-section
    const heroSectionNode = nodes.find((node: any) => {
      const nodeId = node.nodeId || node.id
      return nodeId === "hero-section"
    })

    if (heroSectionNode?.elementStyles?.["hero-subtitle"]) {
      console.log("⚠️ Found hero-subtitle in hero-section.elementStyles")
      console.log("   This should be cleaned up in the component code")
    }

  } catch (error) {
    console.error("❌ Error cleaning up hero-subtitle:", error)
    process.exit(1)
  }
}

cleanupHeroSubtitle()