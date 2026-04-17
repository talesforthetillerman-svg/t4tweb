// Script para medir DOM real en /editor y /
const puppeteer = require('puppeteer');

async function measureDOM(url, name) {
  console.log(`\n=== MEDICIÓN DOM: ${name} (${url}) ===`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capturar console.log del navegador
  page.on('console', msg => {
    if (msg.text().includes('[DOM-MEASURE]') || 
        msg.text().includes('[SANITY-LOADER]') ||
        msg.text().includes('[EDITOR-BUILD-NODE]') ||
        msg.text().includes('[HERO-GEOM]')) {
      console.log(`[BROWSER][${name}] ${msg.text()}`);
    }
  });
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  // Esperar a que se ejecute el efecto de medición (100ms)
  await page.waitForTimeout(500);
  
  // También ejecutar medición manual desde la consola del navegador
  const measurements = await page.evaluate(() => {
    const nodes = [
      { id: "hero-section", selector: '[data-editor-node-id="hero-section"]' },
      { id: "hero-bg-image", selector: '[data-editor-node-id="hero-bg-image"]' },
      { id: "hero-title", selector: '[data-editor-node-id="hero-title"]' },
      { id: "hero-subtitle", selector: '[data-editor-node-id="hero-subtitle"]' },
      { id: "hero-logo", selector: '[data-editor-node-id="hero-logo"]' }
    ];
    
    const results = {};
    
    nodes.forEach(({ id, selector }) => {
      const element = document.querySelector(selector);
      if (!element) {
        results[id] = { error: 'Element not found' };
        return;
      }
      
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      const dataset = element.dataset;
      
      results[id] = {
        dataset: {
          editorGeometryX: dataset.editorGeometryX,
          editorGeometryY: dataset.editorGeometryY,
          editorGeometryWidth: dataset.editorGeometryWidth,
          editorGeometryHeight: dataset.editorGeometryHeight,
          editorScale: dataset.editorScale,
          editorExplicitPosition: dataset.editorExplicitPosition
        },
        boundingRect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left)
        },
        computedStyle: {
          transform: computed.transform,
          transformOrigin: computed.transformOrigin,
          width: computed.width,
          height: computed.height,
          marginLeft: computed.marginLeft,
          marginRight: computed.marginRight,
          paddingLeft: computed.paddingLeft,
          paddingRight: computed.paddingRight,
          textAlign: computed.textAlign,
          position: computed.position,
          display: computed.display
        },
        offsetParent: element.offsetParent?.id || element.offsetParent?.className?.substring(0, 50) || 'null'
      };
    });
    
    return results;
  });
  
  console.log(JSON.stringify(measurements, null, 2));
  
  await browser.close();
}

async function main() {
  try {
    await measureDOM('http://localhost:3000', 'PÚBLICA (/)');
    await measureDOM('http://localhost:3000/editor', 'EDITOR (/editor)');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();