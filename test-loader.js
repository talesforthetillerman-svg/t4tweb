// Test script to check what values are loaded from Sanity
const { loadHeroData } = require('./lib/sanity/hero-loader');

async function test() {
  console.log('Testing hero loader...');
  try {
    const data = await loadHeroData('published');
    console.log('Loaded data:');
    console.log('Title:', data.title);
    console.log('Subtitle:', data.subtitle);
    
    if (data.elementStyles) {
      console.log('\nElement styles:');
      console.log('hero-title:', JSON.stringify(data.elementStyles['hero-title'], null, 2));
      console.log('hero-subtitle:', JSON.stringify(data.elementStyles['hero-subtitle'], null, 2));
      console.log('hero-logo:', JSON.stringify(data.elementStyles['hero-logo'], null, 2));
      console.log('hero-bg-image:', JSON.stringify(data.elementStyles['hero-bg-image'], null, 2));
    } else {
      console.log('No element styles found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();