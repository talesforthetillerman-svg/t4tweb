#!/usr/bin/env node

import { createClient } from 'next-sanity';

const projectId = 'qtpb6qpz';
const dataset = 'production';

async function testHeroLoader() {
  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
    perspective: "published",
  });

  const query = `*[_type == "heroSection"][0]{
    title,
    titleHighlight,
    subtitle,
    description,
    scrollLabel,
    ctaButtons[]{ label, href, variant },
    "logoUrl": logo.asset->url,
    "bgUrl": backgroundImage.asset->url,
    elementStyles
  }`;

  try {
    const result = await client.fetch(query);

    console.log('\n=== HERO LOADER TEST ===\n');
    console.log('Full result keys:', Object.keys(result).sort());

    if (result?.elementStyles) {
      console.log('\n✅ elementStyles found:');
      console.log('Keys:', Object.keys(result.elementStyles).sort());
      console.log('\nFull elementStyles:');
      console.log(JSON.stringify(result.elementStyles, null, 2));
    } else {
      console.log('\n❌ NO elementStyles found in result');
    }

  } catch (err) {
    console.error('Error fetching:', err);
  }
}

testHeroLoader();
