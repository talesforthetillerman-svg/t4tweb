#!/usr/bin/env node

import { createClient } from 'next-sanity';

const projectId = 'qtpb6qpz';
const dataset = 'production';

async function testNavLoader() {
  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
    perspective: "published",
  });

  const query = `*[_type == "navigation"][0]{
    brandName,
    "brandLogoUrl": brandLogo.asset->url,
    links[]{ label, href },
    ctaLabel,
    ctaHref,
    elementStyles
  }`;

  try {
    const result = await client.fetch(query);

    console.log('\n=== NAVBAR LOADER TEST ===\n');
    console.log('Full result:', JSON.stringify(result, null, 2));

    if (result?.elementStyles) {
      console.log('\n✅ elementStyles found:');
      console.log('Keys:', Object.keys(result.elementStyles));
      console.log('nav-logo:', JSON.stringify(result.elementStyles['nav-logo'], null, 2));
      console.log('nav-brand-name:', JSON.stringify(result.elementStyles['nav-brand-name'], null, 2));
    } else {
      console.log('\n❌ NO elementStyles found in result');
    }

  } catch (err) {
    console.error('Error fetching:', err);
  }
}

testNavLoader();
