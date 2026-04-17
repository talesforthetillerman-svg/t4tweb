#!/usr/bin/env tsx

import { createClient } from "next-sanity"
import { resolveSanityDataset, resolveSanityProjectId } from "@/lib/sanity/env"
import dotenv from "dotenv"
import path from "path"

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

async function cleanupHeroFromHomeEditorState() {
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

  console.log("Cleaning up Hero nodes from homeEditorState...")

  try {
    // Read existing homeEditorState
    const doc = await client.fetch(`*[_id == "homeEditorState-singleton"][0]{ nodesJson }`)
    
    if (!doc?.nodesJson) {
      console.log("No homeEditorState document found or empty nodesJson")
      return
    }

    const nodes = JSON.parse(doc.nodesJson)
    if (!Array.isArray(nodes)) {
      console.log("nodesJson is not an array")
      return
    }

    console.log(`Found ${nodes.length} nodes in homeEditorState`)

    // Filter out Hero nodes
    const isHeroStateNode = (id: string): boolean => id === "hero-section" || id.startsWith("hero-")
    const filteredNodes = nodes.filter((node: any) => !isHeroStateNode(node.id || node.nodeId))

    const heroNodesRemoved = nodes.length - filteredNodes.length
    console.log(`Removed ${heroNodesRemoved} Hero nodes from homeEditorState`)

    if (heroNodesRemoved > 0) {
      // Update the document
      await client.createOrReplace({
        _id: "homeEditorState-singleton",
        _type: "homeEditorState",
        updatedAt: new Date().toISOString(),
        nodesJson: JSON.stringify(filteredNodes),
      })
      console.log("✅ homeEditorState updated successfully")
    } else {
      console.log("✅ No Hero nodes found in homeEditorState")
    }

    // Also check for any residual Hero nodes in the actual document
    const heroNodes = nodes.filter((node: any) => isHeroStateNode(node.id || node.nodeId))
    if (heroNodes.length > 0) {
      console.log("Found residual Hero nodes:", heroNodes.map((n: any) => n.id || n.nodeId))
    }

  } catch (error) {
    console.error("Error cleaning up homeEditorState:", error)
    process.exit(1)
  }
}

cleanupHeroFromHomeEditorState()