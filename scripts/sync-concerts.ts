import { createClient } from 'next-sanity'

const client = createClient({
  projectId: 'qtpb6qpz',
  dataset: 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function main() {
  if (!process.env.SANITY_API_TOKEN) {
    throw new Error('SANITY_API_TOKEN env variable is required')
  }

  console.log('Deleting existing concerts...')
  await client.delete({ query: '_type == "concert"' }).catch(() => {})

  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const csvPath = path.join(process.cwd(), 'public/data/concerts.csv')
  const csv = await fs.readFile(csvPath, 'utf8')

  const lines = csv.trim().split('\n')
  const concerts = lines.slice(1).map(line => {
    const values = line.split(',')
    return {
      venue: values[0],
      city: values[1],
      country: values[2],
      date: values[3],
      time: values[4],
      status: values[5],
      genre: values[6],
      capacity: values[7],
      price: values[8] === 'Free' ? 0 : parseInt(values[8]) || 0,
    }
  })

  console.log(`Importing ${concerts.length} concerts to Sanity...`)

  for (const concert of concerts) {
    try {
      await client.create({
        _type: 'concert',
        venue: concert.venue,
        city: concert.city,
        country: concert.country,
        date: concert.date,
        time: concert.time,
        status: concert.status,
        genre: concert.genre,
        capacity: concert.capacity,
        price: concert.price,
      })
      console.log(`  ✓ ${concert.venue}`)
    } catch (err: any) {
      console.error(`  ✗ ${concert.venue}: ${err.message}`)
    }
  }

  console.log('Done!')
}

main().catch(console.error)
