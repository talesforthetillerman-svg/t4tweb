/**
 * Diagnostic tool to trace what data Sanity is returning for each perspective.
 * Run this to verify if Sanity documents are actually being updated.
 */

import { createClient } from 'next-sanity'
import { resolveSanityDataset, resolveSanityProjectId } from './env'

export async function diagnoseSanityState() {
  const projectId = resolveSanityProjectId()
  const dataset = resolveSanityDataset()

  console.log('\n=== SANITY DIAGNOSTIC ===')
  console.log(`Project: ${projectId}, Dataset: ${dataset}`)

  // Fetch published perspective
  const publishedClient = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    perspective: 'published',
    useCdn: false,
  })

  // Fetch previewDrafts perspective
  const previewClient = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    perspective: 'previewDrafts',
    useCdn: false,
  })

  try {
    const publishedHero = await publishedClient.fetch(
      `*[_type == "heroSection"][0]{ _id, title, titleHighlight, subtitle, _updatedAt }`
    )
    const previewHero = await previewClient.fetch(
      `*[_type == "heroSection"][0]{ _id, title, titleHighlight, subtitle, _updatedAt }`
    )

    console.log('\n--- HERO SECTION ---')
    console.log('Published:', publishedHero)
    console.log('Preview:', previewHero)
    console.log('Mismatch?', JSON.stringify(publishedHero) !== JSON.stringify(previewHero))

    const publishedNav = await publishedClient.fetch(
      `*[_type == "navigation"][0]{ _id, brandName, links[]{ label, href }, _updatedAt }`
    )
    const previewNav = await previewClient.fetch(
      `*[_type == "navigation"][0]{ _id, brandName, links[]{ label, href }, _updatedAt }`
    )

    console.log('\n--- NAVIGATION ---')
    console.log('Published:', publishedNav)
    console.log('Preview:', previewNav)
    console.log('Mismatch?', JSON.stringify(publishedNav) !== JSON.stringify(previewNav))

  } catch (error) {
    console.error('Diagnostic error:', error)
  }
}
