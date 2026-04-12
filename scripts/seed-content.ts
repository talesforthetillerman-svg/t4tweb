import { createClient } from 'next-sanity'

const client = createClient({
  projectId: 'qtpb6qpz',
  dataset: 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function seedContent() {
  const docs = [
    {
      _type: 'siteSettings',
      siteTitle: 'Tales for the Tillerman | Berlin World Music Band',
      siteDescription: 'Berlin-based world music collective blending funk, soul, and reggae.',
      footerTagline: 'Berlin-based world music collective blending funk, soul, and reggae.',
      socialLinks: [
        { _key: '1', name: 'Instagram', url: 'https://www.instagram.com/tales4tillerman' },
        { _key: '2', name: 'YouTube', url: 'https://www.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ' },
        { _key: '3', name: 'Telegram', url: 'https://t.me/talesforthetillerman' },
        { _key: '4', name: 'Linktree', url: 'https://linktr.ee/tales4tillerman' },
      ],
      streamingPlatforms: [
        { _key: '1', name: 'Spotify', url: 'https://open.spotify.com/intl-es/artist/0FHjK3O0k8HQMrJsF7KQwF' },
        { _key: '2', name: 'Apple Music', url: 'https://music.apple.com/us/artist/tales-for-the-tillerman/1819840222' },
        { _key: '3', name: 'YouTube Music', url: 'https://music.youtube.com/channel/UCiSLr9s4NLC1kzHBqJirsrQ' },
        { _key: '4', name: 'Amazon Music', url: 'https://music.amazon.co.uk/artists/B0FCNWCSZC/tales-for-the-tillerman' },
        { _key: '5', name: 'Bandcamp', url: 'https://talesforthetillerman.bandcamp.com/' },
        { _key: '6', name: 'Bandsintown', url: 'https://www.bandsintown.com/a/15468933-tales-for-the-tillerman' },
      ],
    },
    {
      _type: 'heroSection',
      title: 'A vibrant blend of',
      titleHighlight: 'funk, soul and world music',
      subtitle: 'BERLIN-BASED LIVE COLLECTIVE',
      description: 'Tales for the Tillerman brings groove-driven live energy to festivals, clubs and special events — with a warm, rhythmic sound made to move a room.',
    },
    {
      _type: 'aboutSection',
      eyebrow: 'About the Band',
      title: 'A Journey Through Sound',
      bioParagraphs: [
        'Tales for the Tillerman is a Berlin-based collective blending world music, funk, soul, and reggae into a vibrant live experience. With roots spanning across continents, the band creates a sound that moves between groove, warmth, rhythm, and energy.',
        'Their performances balance musical depth with danceable power, bringing together five musicians into one fluid, dynamic live act. Based in Berlin, the project brings together world music fusion, stage energy, and a strong collective identity.',
      ],
      bioTagline: '5 musicians • Berlin-based • World music fusion • Live experience',
    },
    {
      _type: 'bandMember',
      fullName: 'Janosch Puhe',
      role: 'Main Vocals',
      order: 1,
    },
    {
      _type: 'bandMember',
      fullName: 'J.Ma Garcia Lopez',
      role: 'Keys and Synth',
      order: 2,
    },
    {
      _type: 'bandMember',
      fullName: 'Otto Lorenz Contreras',
      role: 'Drums',
      order: 3,
    },
    {
      _type: 'bandMember',
      fullName: 'Robii Crowford',
      role: 'Electric Guitar',
      order: 4,
    },
    {
      _type: 'bandMember',
      fullName: 'Tarik Benatmane',
      role: 'Electric Bass',
      order: 5,
    },
    {
      _type: 'pressKitSection',
      eyebrow: 'Media Resources',
      title: 'Professional Press Materials',
      description: 'Everything you need for press coverage, event promotion, and booking information.',
      resources: [
        { _key: '1', title: 'Band Logo', description: 'High-resolution logo files', href: 'https://linktr.ee/tales4tillerman' },
      ],
      managerName: 'Momo Garcia',
      managerRole: 'Band Management',
      managerEmail: 'talesforthetillerman@gmail.com',
    },
    {
      _type: 'contactSection',
      eyebrow: 'Contact',
      title: 'Book the Band',
      description: 'Get in touch for booking inquiries and event collaborations.',
      contactMethods: [
        { _key: '1', title: 'Email Us', description: 'For booking inquiries Momo Garcia - Band Management', href: 'mailto:talesforthetillerman@gmail.com', label: 'talesforthetillerman@gmail.com', contactName: 'Momo Garcia - Management' },
        { _key: '2', title: 'Telegram', description: 'Janosch Puhe - Quick response for urgent matters', href: 'https://t.me/Janoschpuhe', label: '@Janoschpuhe', contactName: 'Janosch Puhe - Quick response' },
      ],
    },
    {
      _type: 'latestRelease',
      title: 'Latest Release',
      subtitle: 'Fresh groove, built for live stages and late-night playlists.',
      youtubeId: 'xofflmVqYGs',
      ctaButtons: [
        { _key: '1', label: 'Stream the New Single', href: 'https://open.spotify.com/intl-es/artist/0FHjK3O0k8HQMrJsF7KQwF' },
        { _key: '2', label: 'See Upcoming Shows', href: 'https://www.bandsintown.com/a/15468933-tales-for-the-tillerman' },
      ],
    },
    {
      _type: 'navigation',
      brandName: 'Tales for the Tillerman',
      links: [
        { _key: '1', label: 'About', href: '#about' },
        { _key: '2', label: 'Press', href: '#press-kit' },
        { _key: '3', label: 'Band', href: '#band' },
        { _key: '4', label: 'Live', href: '#live' },
        { _key: '5', label: 'Contact', href: '#contact' },
      ],
      ctaLabel: 'Book',
      ctaHref: '#contact',
    },
  ]

  console.log(`Seeding ${docs.length} documents...`)

  for (const doc of docs) {
    try {
      await client.create(doc as any)
      console.log(`  ✓ ${doc._type}`)
    } catch (err: any) {
      console.error(`  ✗ ${doc._type}: ${err.message}`)
    }
  }

  console.log('Done!')
}

seedContent().catch(console.error)
