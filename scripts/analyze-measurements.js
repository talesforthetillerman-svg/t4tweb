#!/usr/bin/env node

/**
 * Script to analyze layout measurements from browser console
 * Copy-paste console output here to analyze differences
 */

const fs = require('fs')
const path = require('path')

// Example format of what we expect from browser console
const exampleEditorLog = `[LAYOUT-DEBUG] /editor - 2026-04-16T20:00:00.000Z
📐 hero-title
📍 Position: 589px, 197px
📏 Size: 886px × 129px
🎨 Transform: translate(589px, 197px) scale(0.808)
📐 Transform Origin: 50% 50%
📝 Text Align: center
🎯 Position: absolute
👁 Display: block
🗺 Dataset Geometry: { x: '589', y: '197', width: '886', height: '129', scale: '0.808' }
💾 Persisted Data: { x: 589, y: 197, width: 886, height: 129, scale: 0.808, textAlign: 'center' }

📐 hero-subtitle
📍 Position: 436px, 348px
📏 Size: 537px × 24px
🎨 Transform: translate(436px, 348px) scale(1.997)
📐 Transform Origin: 50% 50%
📝 Text Align: center
🎯 Position: absolute
👁 Display: block
🗺 Dataset Geometry: { x: '436', y: '348', width: '537', height: '24', scale: '1.997' }
💾 Persisted Data: { x: 436, y: 348, width: 537, height: 24, scale: 1.997, textAlign: 'center' }`

const examplePublicLog = `[LAYOUT-DEBUG] / - 2026-04-16T20:00:00.000Z
📐 hero-title
📍 Position: 600px, 210px
📏 Size: 900px × 140px
🎨 Transform: translate(600px, 210px) scale(0.808)
📐 Transform Origin: 50% 50%
📝 Text Align: center
🎯 Position: absolute
👁 Display: block
🗺 Dataset Geometry: { x: '589', y: '197', width: '886', height: '129', scale: '0.808' }
💾 Persisted Data: { x: 589, y: 197, width: 886, height: 129, scale: 0.808, textAlign: 'center' }

📐 hero-subtitle
📍 Position: 450px, 360px
📏 Size: 550px × 30px
🎨 Transform: translate(450px, 360px) scale(1.997)
📐 Transform Origin: 50% 50%
📝 Text Align: center
🎯 Position: absolute
👁 Display: block
🗺 Dataset Geometry: { x: '436', y: '348', width: '537', height: '24', scale: '1.997' }
💾 Persisted Data: { x: 436, y: 348, width: 537, height: 24, scale: 1.997, textAlign: 'center' }`

function parseLog(log) {
  const lines = log.split('\n')
  const measurements = {}
  let currentNode = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Start of a new node measurement
    if (line.startsWith('📐')) {
      const nodeId = line.replace('📐 ', '').trim()
      currentNode = nodeId
      measurements[nodeId] = {}
      continue
    }
    
    if (!currentNode) continue
    
    // Parse position
    if (line.startsWith('📍 Position:')) {
      const match = line.match(/📍 Position:\s*(\d+)px,\s*(\d+)px/)
      if (match) {
        measurements[currentNode].x = parseInt(match[1])
        measurements[currentNode].y = parseInt(match[2])
      }
    }
    
    // Parse size
    if (line.startsWith('📏 Size:')) {
      const match = line.match(/📏 Size:\s*(\d+)px\s*×\s*(\d+)px/)
      if (match) {
        measurements[currentNode].width = parseInt(match[1])
        measurements[currentNode].height = parseInt(match[2])
      }
    }
    
    // Parse transform
    if (line.startsWith('🎨 Transform:')) {
      measurements[currentNode].transform = line.replace('🎨 Transform: ', '').trim()
    }
    
    // Parse dataset geometry
    if (line.startsWith('🗺 Dataset Geometry:')) {
      const geoStr = line.replace('🗺 Dataset Geometry: ', '').trim()
      try {
        const geo = eval(`(${geoStr})`)
        measurements[currentNode].dataset = geo
      } catch (e) {
        measurements[currentNode].dataset = {}
      }
    }
    
    // Parse persisted data
    if (line.startsWith('💾 Persisted Data:')) {
      const dataStr = line.replace('💾 Persisted Data: ', '').trim()
      try {
        const data = eval(`(${dataStr})`)
        measurements[currentNode].persisted = data
      } catch (e) {
        measurements[currentNode].persisted = {}
      }
    }
  }
  
  return measurements
}

function compareMeasurements(editor, publicPage) {
  const nodes = [...new Set([...Object.keys(editor), ...Object.keys(publicPage)])]
  const comparison = {}
  
  nodes.forEach(nodeId => {
    const e = editor[nodeId] || {}
    const p = publicPage[nodeId] || {}
    
    comparison[nodeId] = {
      editor: { x: e.x, y: e.y, width: e.width, height: e.height },
      public: { x: p.x, y: p.y, width: p.width, height: p.height },
      deltas: {
        deltaX: p.x - e.x,
        deltaY: p.y - e.y,
        deltaWidth: p.width - e.width,
        deltaHeight: p.height - e.height,
      },
      transformMatch: e.transform === p.transform,
      dataset: {
        editor: e.dataset,
        public: p.dataset,
        match: JSON.stringify(e.dataset) === JSON.stringify(p.dataset)
      },
      persisted: {
        editor: e.persisted,
        public: p.persisted,
        match: JSON.stringify(e.persisted) === JSON.stringify(p.persisted)
      }
    }
  })
  
  return comparison
}

function printComparison(comparison) {
  console.log('📊 LAYOUT COMPARISON ANALYSIS')
  console.log('=' .repeat(50))
  
  Object.entries(comparison).forEach(([nodeId, data]) => {
    console.log(`\n🔍 ${nodeId}`)
    console.log(`   Editor:  ${data.editor.x},${data.editor.y} | ${data.editor.width}×${data.editor.height}`)
    console.log(`   Public:  ${data.public.x},${data.public.y} | ${data.public.width}×${data.public.height}`)
    console.log(`   Deltas:  Δx=${data.deltas.deltaX}px, Δy=${data.deltas.deltaY}px, Δw=${data.deltas.deltaWidth}px, Δh=${data.deltas.deltaHeight}px`)
    
    if (!data.transformMatch) {
      console.log(`   ⚠️  Transform mismatch`)
    }
    
    if (!data.dataset.match) {
      console.log(`   ⚠️  Dataset mismatch`)
    }
    
    if (!data.persisted.match) {
      console.log(`   ⚠️  Persisted data mismatch`)
    }
    
    // Check if offset is significant (> 5px)
    const significantOffset = Math.abs(data.deltas.deltaX) > 5 || Math.abs(data.deltas.deltaY) > 5
    if (significantOffset) {
      console.log(`   ❌ SIGNIFICANT OFFSET DETECTED`)
    } else if (data.deltas.deltaX !== 0 || data.deltas.deltaY !== 0) {
      console.log(`   ⚠️  Minor offset (acceptable)`)
    } else {
      console.log(`   ✅ Perfect match`)
    }
  })
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📈 SUMMARY')
  
  const significantIssues = Object.entries(comparison).filter(([_, data]) => {
    return Math.abs(data.deltas.deltaX) > 5 || Math.abs(data.deltas.deltaY) > 5 || 
           !data.transformMatch || !data.dataset.match || !data.persisted.match
  })
  
  if (significantIssues.length === 0) {
    console.log('✅ All nodes match within acceptable tolerance')
  } else {
    console.log(`❌ Found ${significantIssues.length} nodes with issues:`)
    significantIssues.forEach(([nodeId, data]) => {
      console.log(`   - ${nodeId}: Δx=${data.deltas.deltaX}px, Δy=${data.deltas.deltaY}px`)
    })
  }
}

// Instructions
console.log('📋 INSTRUCTIONS:')
console.log('1. Open http://localhost:3001/editor?layoutDebug=1')
console.log('2. Copy the console output starting with [LAYOUT-DEBUG]')
console.log('3. Open http://localhost:3001/?layoutDebug=1')
console.log('4. Copy that console output too')
console.log('5. Paste both outputs below to analyze differences')
console.log('\nOr run the dev server and check the visual overlay')
console.log('The overlay shows red boxes around each measured element')

// If we have saved logs, analyze them
const editorLogPath = path.join(__dirname, 'editor-log.txt')
const publicLogPath = path.join(__dirname, 'public-log.txt')

if (fs.existsSync(editorLogPath) && fs.existsSync(publicLogPath)) {
  console.log('\n📊 Analyzing saved logs...')
  const editorLog = fs.readFileSync(editorLogPath, 'utf8')
  const publicLog = fs.readFileSync(publicLogPath, 'utf8')
  
  const editorMeasurements = parseLog(editorLog)
  const publicMeasurements = parseLog(publicLog)
  const comparison = compareMeasurements(editorMeasurements, publicMeasurements)
  
  printComparison(comparison)
} else {
  console.log('\nNo saved logs found. Run measurements first.')
  console.log('Example expected format:')
  console.log(exampleEditorLog.substring(0, 200) + '...')
}