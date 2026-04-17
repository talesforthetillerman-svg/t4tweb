import { createClient } from 'next-sanity'

const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

if (!projectId || !dataset) {
  console.error('❌ Missing SANITY_PROJECT_ID or SANITY_DATASET')
  process.exit(1)
}

if (!token) {
  console.error('❌ Missing SANITY_API_WRITE_TOKEN or SANITY_API_TOKEN')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token,
  perspective: 'published',
})

async function cleanupHero() {
  console.log('\n=== HERO SECTION CLEANUP ===\n')
  console.log(`Writing to: ${projectId} / ${dataset}\n`)

  try {
    // First, get the document
    const doc = await client.fetch(`*[_type == "heroSection"][0]{ _id }`)

    if (!doc) {
      console.log('❌ No heroSection document found')
      process.exit(1)
    }

    console.log(`Found document ID: ${doc._id}\n`)
    console.log('Cleaning fields:')
    console.log('  - title → "" (was: "A vibrant blend of funk, soul and world music")')
    console.log('  - titleHighlight → "" (was: "test accent phrase")')
    console.log('  - ctaButtons → [] (was: 2 buttons)')
    console.log('')

    // Clean the document
    const result = await client
      .patch(doc._id)
      .set({
        title: '',
        titleHighlight: '',
        ctaButtons: [],
      })
      .commit()

    console.log('✅ Document cleaned in Sanity!')
    console.log(`\nUpdated fields:`)
    console.log(`  - title: "${result.title || '(empty)'}"\n`)
    console.log(`  - titleHighlight: "${result.titleHighlight || '(empty)'}"\n`)
    console.log(`  - ctaButtons: ${result.ctaButtons?.length || 0} items\n`)

  } catch (error) {
    console.error('❌ Error writing to Sanity:', error)
    process.exit(1)
  }
}

cleanupHero()
