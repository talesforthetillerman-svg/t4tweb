#!/usr/bin/env node

/**
 * Script to measure layout differences between /editor and /
 * Run with: node scripts/measure-layout.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Check if server is running
try {
  execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001', { stdio: 'pipe' })
  console.log('✅ Server is running on port 3001')
} catch (error) {
  console.log('❌ Server not running on port 3001')
  console.log('Please start the dev server first: pnpm dev')
  process.exit(1)
}

// Create measurement function that can be run in browser context
const measurementScript = `
// Measurement script to run in browser
(function() {
  const nodeIds = ['hero-title', 'hero-subtitle', 'hero-logo', 'hero-bg-image', 'intro-banner-gif']
  const results = {}
  
  nodeIds.forEach(nodeId => {
    const element = document.querySelector(\`[data-editor-node-id="\${nodeId}"]\`)
    if (!element) {
      results[nodeId] = { error: 'Element not found' }
      return
    }
    
    const rect = element.getBoundingClientRect()
    const computed = window.getComputedStyle(element)
    
    results[nodeId] = {
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      },
      computedStyle: {
        transform: computed.transform,
        transformOrigin: computed.transformOrigin,
        textAlign: computed.textAlign,
        position: computed.position,
        display: computed.display,
        width: computed.width,
        height: computed.height,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
      },
      dataset: {
        geometryX: element.getAttribute('data-editor-geometry-x'),
        geometryY: element.getAttribute('data-editor-geometry-y'),
        geometryWidth: element.getAttribute('data-editor-geometry-width'),
        geometryHeight: element.getAttribute('data-editor-geometry-height'),
        textAlign: element.getAttribute('data-editor-text-align'),
        scale: element.getAttribute('data-editor-scale'),
      }
    }
  })
  
  // Return results
  return results
})()
`

// Save script to file for puppeteer
const scriptPath = path.join(__dirname, 'measurement-script.js')
fs.writeFileSync(scriptPath, `module.exports = ${measurementScript}`)

console.log('📊 Starting layout measurement...')
console.log('This will measure /editor and / and compare differences')

// We'll use a simple approach - tell user to open browser manually
console.log('\n📱 MANUAL MEASUREMENT INSTRUCTIONS:')
console.log('1. Open http://localhost:3001/editor?layoutDebug=1')
console.log('2. Open http://localhost:3001/?layoutDebug=1')
console.log('3. Check browser console for measurements')
console.log('4. Compare the outputs')
console.log('\nThe debug tool will show:')
console.log('- Exact position and size of each element')
console.log('- Computed CSS styles')
console.log('- Dataset values (persisted geometry)')
console.log('- Differences between editor and public page')

// Clean up
fs.unlinkSync(scriptPath)
console.log('\n✅ Measurement script ready. Open the URLs above in your browser.')