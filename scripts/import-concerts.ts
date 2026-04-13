import { createClient } from 'next-sanity'
import fs from 'fs'
import path from 'path'

const client = createClient({
  projectId: 'qtpb6qpz',
  dataset: 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

function parseCSV(csv: string) {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const values = line.split(',')
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() || '' })
    return obj
  })
}

async function importConcerts() {
  const csvPath = path.join(process.cwd(), 'public/data/concerts.csv')
  const csv = fs.readFileSync(csvPath, 'utf-8')
  const concerts = parseCSV(csv)

  console.log(`Importing ${concerts.length} concerts...`)

  for (const c of concerts) {
    const doc = {
      _type: 'concert',
      venue: c.Venue,
      city: c.City,
      country: c.Country,
      date: c.Date,
      time: c.Time,
      status: c.Status,
      genre: c.Genre,
      capacity: c.Capacity,
      price: c.Price === 'Free' ? 0 : Number(c.Price),
    }
    try {
      await client.create(doc)
      console.log(`  ✓ ${c.Venue} - ${c.City}`)
    } catch (err: any) {
      console.error(`  ✗ ${c.Venue}: ${err.message}`)
    }
  }

  console.log('Done!')
}

importConcerts().catch(console.error)
