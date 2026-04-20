import { createClient } from 'next-sanity'

const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET

if (!projectId || !dataset) {
  console.error('❌ Missing SANITY_PROJECT_ID or SANITY_DATASET')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'published',
})

async function diagnoseHero() {
  console.log('\n=== HERO SECTION DIAGNOSIS ===\n')
  console.log(`Reading from: ${projectId} / ${dataset}\n`)

  try {
    const doc = await client.fetch(
      `*[_type == "heroSection"][0]{
        _id,
        title,
        titleHighlight,
        subtitle,
        description,
        scrollLabel,
        ctaButtons,
        elementStyles
      }`
    )

    if (!doc) {
      console.log('❌ No heroSection document found in Sanity')
      return
    }

    console.log('📄 DOCUMENT FOUND:\n')
    console.log(`ID: ${doc._id}`)
    console.log(`title: "${doc.title || '(empty)'}"\n`)
    console.log(`titleHighlight: "${doc.titleHighlight || '(empty)'}"\n`)
    console.log(`subtitle: "${doc.subtitle || '(empty)'}"\n`)
    console.log(`scrollLabel: "${doc.scrollLabel || '(empty)'}"\n`)
    console.log(`ctaButtons: ${doc.ctaButtons ? JSON.stringify(doc.ctaButtons, null, 2) : '(empty)'}\n`)
    console.log(`elementStyles keys: ${doc.elementStyles ? Object.keys(doc.elementStyles).join(', ') : '(empty)'}\n`)

    // Analysis
    console.log('\n=== ANALYSIS ===\n')

    if (doc.title || doc.titleHighlight) {
      console.log('⚠️  FOUND: Old test content persisted in Sanity!')
      console.log(`   title: "${doc.title}"`)
      console.log(`   titleHighlight: "${doc.titleHighlight}"`)
      console.log('\n💡 This is what the public site is reading.\n')
    } else {
      console.log('✅ Hero fields are clean (empty)\n')
    }

    if (doc.ctaButtons && doc.ctaButtons.length > 0) {
      console.log('⚠️  FOUND: Old ctaButtons persisted!')
      console.log(`   ${doc.ctaButtons.length} buttons found`)
      console.log(`   ${JSON.stringify(doc.ctaButtons, null, 2)}\n`)
    } else {
      console.log('✅ ctaButtons clean (empty)\n')
    }

  } catch (error) {
    console.error('❌ Error reading from Sanity:', error)
    process.exit(1)
  }
}

diagnoseHero()
