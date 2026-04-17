// Script para medir y comparar hero-title vs hero-subtitle
const puppeteer = require('puppeteer');

async function measurePage(url, pageName) {
  console.log(`\n\n=== ${pageName.toUpperCase()} (${url}) ===\n`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capturar todos los console.log
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('=== COMPARACIÓN REAL HERO TITLE vs SUBTITLE ===') || 
        text.includes('HERO-LOADER-DETAILED') ||
        text.includes('GET-ELEMENT-LAYOUT-STYLE')) {
      console.log(text);
    }
  });
  
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Esperar a que se ejecute el logging
  await page.waitForTimeout(1000);
  
  // También ejecutar medición manual
  const measurements = await page.evaluate(() => {
    const titleEl = document.querySelector('[data-editor-node-id="hero-title"]');
    const subtitleEl = document.querySelector('[data-editor-node-id="hero-subtitle"]');
    
    if (!titleEl || !subtitleEl) return { error: 'Elements not found' };
    
    const getComputedStyleSummary = (el) => {
      const computed = window.getComputedStyle(el);
      return {
        transform: computed.transform,
        transformOrigin: computed.transformOrigin,
        width: computed.width,
        height: computed.height,
        maxWidth: computed.maxWidth,
        display: computed.display,
        position: computed.position,
        marginLeft: computed.marginLeft,
        marginRight: computed.marginRight,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        textAlign: computed.textAlign,
        letterSpacing: computed.letterSpacing
      };
    };
    
    return {
      title: {
        dataset: {
          geometryX: titleEl.dataset.editorGeometryX,
          geometryY: titleEl.dataset.editorGeometryY,
          geometryWidth: titleEl.dataset.editorGeometryWidth,
          geometryHeight: titleEl.dataset.editorGeometryHeight,
          scale: titleEl.dataset.editorScale,
          explicitPosition: titleEl.dataset.editorExplicitPosition
        },
        rect: titleEl.getBoundingClientRect(),
        computedStyle: getComputedStyleSummary(titleEl),
        offsetParent: titleEl.offsetParent?.className?.substring(0, 100) || 'null'
      },
      subtitle: {
        dataset: {
          geometryX: subtitleEl.dataset.editorGeometryX,
          geometryY: subtitleEl.dataset.editorGeometryY,
          geometryWidth: subtitleEl.dataset.editorGeometryWidth,
          geometryHeight: subtitleEl.dataset.editorGeometryHeight,
          scale: subtitleEl.dataset.editorScale,
          explicitPosition: subtitleEl.dataset.editorExplicitPosition
        },
        rect: subtitleEl.getBoundingClientRect(),
        computedStyle: getComputedStyleSummary(subtitleEl),
        offsetParent: subtitleEl.offsetParent?.className?.substring(0, 100) || 'null'
      }
    };
  });
  
  console.log('\n--- MEDICIÓN MANUAL ---');
  console.log(JSON.stringify(measurements, null, 2));
  
  await browser.close();
}

async function main() {
  try {
    await measurePage('http://localhost:3000', 'PÚBLICA');
    await measurePage('http://localhost:3000/editor', 'EDITOR');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();