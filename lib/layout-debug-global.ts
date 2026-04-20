// Global layout debug system
// Injects into window.__LAYOUT_DEBUG__ when ?layoutDebug=1 is present

interface LayoutDebugNodeMetrics {
  nodeId: string
  route: string
  timestamp: string
  rect: {
    left: number
    top: number
    width: number
    height: number
    right: number
    bottom: number
  }
  computedStyle: {
    transform: string
    transformOrigin: string
    position: string
    display: string
    textAlign: string
    fontSize: string
    lineHeight: string
    letterSpacing: string
    color: string
    backgroundImage: string
    backgroundClip: string
    WebkitBackgroundClip: string
    WebkitTextFillColor: string
    overflow: string
    justifyContent: string
    alignItems: string
    margin: string
    padding: string
    border: string
    boxSizing: string
  }
  dataset: Record<string, string | undefined>
  className: string
  inlineStyle: Record<string, string>
  persistedData?: any
}

interface LayoutDebugComparison {
  nodeId: string
  editor: LayoutDebugNodeMetrics
  public: LayoutDebugNodeMetrics
  deltas: {
    left: number
    top: number
    width: number
    height: number
  }
  styleDiffs: Array<{
    property: string
    editorValue: string
    publicValue: string
  }>
  datasetDiffs: Array<{
    key: string
    editorValue: string | undefined
    publicValue: string | undefined
  }>
}

class LayoutDebugGlobal {
  private metrics: Map<string, LayoutDebugNodeMetrics> = new Map()
  private criticalNodeIds = [
    'hero-section',
    'hero-title', 
    'hero-subtitle',
    'hero-logo',
    'hero-bg-image',
    'intro-section',
    'intro-banner-text',
    'intro-banner-gif'
  ]

  constructor() {
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('layoutDebug')) return
    
    this.setupGlobal()
    this.measureAll()
    
    // Auto-measure on resize and scroll
    window.addEventListener('resize', () => { this.measureAll() })
    window.addEventListener('scroll', () => { this.measureAll() })
    
    console.log('[LAYOUT-DEBUG] Global debug system initialized for route:', window.location.pathname)
  }

  private setupGlobal() {
    const self = this
    ;(window as any).__LAYOUT_DEBUG__ = {
      metrics: this.metrics,
      measureAll: function() { return self.measureAll() },
      getNode: function(nodeId: string) { return self.metrics.get(nodeId) },
      getAll: function() { return Array.from(self.metrics.values()) },
      compareWithStored: function(storedMetrics: LayoutDebugNodeMetrics[]) { return self.compareWithStored(storedMetrics) },
      export: function() { return self.exportMetrics() }
    }
    
    // Add compare function
    ;(window as any).compareHeroLayout = function() { return self.compareHeroLayout() }
  }

  measureNode(nodeId: string): LayoutDebugNodeMetrics | null {
    const element = document.getElementById(nodeId)
    if (!element) {
      console.warn(`[LAYOUT-DEBUG] Element with id "${nodeId}" not found`)
      return null
    }

    const rect = element.getBoundingClientRect()
    const computed = window.getComputedStyle(element)
    
    // Get dataset
    const dataset: Record<string, string | undefined> = {}
    for (const key in element.dataset) {
      dataset[key] = element.dataset[key]
    }
    
    // Get specific geometry dataset
    const geometryDataset = {
      'editor-geometry-x': element.dataset.editorGeometryX,
      'editor-geometry-y': element.dataset.editorGeometryY,
      'editor-geometry-width': element.dataset.editorGeometryWidth,
      'editor-geometry-height': element.dataset.editorGeometryHeight,
      'editor-text-align': element.dataset.editorTextAlign,
      'editor-scale': element.dataset.editorScale,
      'editor-explicit-position': element.dataset.editorExplicitPosition
    }

    // Get inline style
    const inlineStyle: Record<string, string> = {}
    for (let i = 0; i < element.style.length; i++) {
      const property = element.style[i]
      inlineStyle[property] = element.style.getPropertyValue(property)
    }

    const metrics: LayoutDebugNodeMetrics = {
      nodeId,
      route: window.location.pathname,
      timestamp: new Date().toISOString(),
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom)
      },
      computedStyle: {
        transform: computed.transform,
        transformOrigin: computed.transformOrigin,
        position: computed.position,
        display: computed.display,
        textAlign: computed.textAlign,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        color: computed.color,
        backgroundImage: computed.backgroundImage,
        backgroundClip: computed.backgroundClip,
        WebkitBackgroundClip: computed.webkitBackgroundClip,
        WebkitTextFillColor: computed.webkitTextFillColor,
        overflow: computed.overflow,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        margin: computed.margin,
        padding: computed.padding,
        border: computed.border,
        boxSizing: computed.boxSizing
      },
      dataset: { ...dataset, ...geometryDataset },
      className: element.className,
      inlineStyle
    }

    this.metrics.set(nodeId, metrics)
    return metrics
  }

  measureAll(): LayoutDebugNodeMetrics[] {
    const results: LayoutDebugNodeMetrics[] = []
    
    this.criticalNodeIds.forEach(nodeId => {
      const metrics = this.measureNode(nodeId)
      if (metrics) results.push(metrics)
    })
    
    // Log summary
    console.group('[LAYOUT-DEBUG] Current Measurements')
    results.forEach(metrics => {
      console.log(`\n${metrics.nodeId}:`)
      console.log(`  Position: ${metrics.rect.left},${metrics.rect.top}`)
      console.log(`  Size: ${metrics.rect.width}x${metrics.rect.height}`)
      console.log(`  Transform: ${metrics.computedStyle.transform || '(none)'}`)
      console.log(`  TextAlign: ${metrics.computedStyle.textAlign}`)
      console.log(`  Dataset geometry: x=${metrics.dataset['editor-geometry-x']}, y=${metrics.dataset['editor-geometry-y']}`)
      
      // Check for gradient
      if (metrics.computedStyle.backgroundImage !== 'none') {
        console.log(`  Gradient: ${metrics.computedStyle.backgroundImage}`)
        console.log(`  BackgroundClip: ${metrics.computedStyle.backgroundClip}`)
        console.log(`  WebkitTextFillColor: ${metrics.computedStyle.WebkitTextFillColor}`)
      }
    })
    console.groupEnd()
    
    return results
  }

  compareWithStored(storedMetrics: LayoutDebugNodeMetrics[]): LayoutDebugComparison[] {
    const comparisons: LayoutDebugComparison[] = []
    
    this.criticalNodeIds.forEach(nodeId => {
      const current = this.metrics.get(nodeId)
      const stored = storedMetrics.find(m => m.nodeId === nodeId)
      
      if (!current || !stored) return
      
      if (current.route === stored.route) {
        console.warn(`[LAYOUT-DEBUG] Cannot compare same route: ${current.route}`)
        return
      }
      
      const comparison = this.compareNodes(current, stored)
      comparisons.push(comparison)
    })
    
    return comparisons
  }

  compareNodes(metricsA: LayoutDebugNodeMetrics, metricsB: LayoutDebugNodeMetrics): LayoutDebugComparison {
    const deltas = {
      left: metricsB.rect.left - metricsA.rect.left,
      top: metricsB.rect.top - metricsA.rect.top,
      width: metricsB.rect.width - metricsA.rect.width,
      height: metricsB.rect.height - metricsA.rect.height
    }
    
    const styleDiffs: Array<{property: string, editorValue: string, publicValue: string}> = []
    const datasetDiffs: Array<{key: string, editorValue: string | undefined, publicValue: string | undefined}> = []
    
    // Compare computed styles
    const styleKeys = Object.keys(metricsA.computedStyle) as Array<keyof LayoutDebugNodeMetrics['computedStyle']>
    styleKeys.forEach(key => {
      const valueA = metricsA.computedStyle[key]
      const valueB = metricsB.computedStyle[key]
      if (valueA !== valueB) {
        styleDiffs.push({
          property: key,
          editorValue: valueA,
          publicValue: valueB
        })
      }
    })
    
    // Compare dataset
    const allDatasetKeys = new Set([...Object.keys(metricsA.dataset), ...Object.keys(metricsB.dataset)])
    allDatasetKeys.forEach(key => {
      const valueA = metricsA.dataset[key]
      const valueB = metricsB.dataset[key]
      if (valueA !== valueB) {
        datasetDiffs.push({
          key,
          editorValue: valueA,
          publicValue: valueB
        })
      }
    })
    
    return {
      nodeId: metricsA.nodeId,
      editor: metricsA.route.includes('editor') ? metricsA : metricsB,
      public: metricsB.route.includes('editor') ? metricsB : metricsA,
      deltas,
      styleDiffs,
      datasetDiffs
    }
  }

  compareHeroLayout(): LayoutDebugComparison[] {
    const storedJson = sessionStorage.getItem('layoutDebugComparison')
    if (!storedJson) {
      console.warn('[LAYOUT-DEBUG] No stored metrics found. First visit /editor?layoutDebug=1 then /?layoutDebug=1')
      return []
    }
    
    try {
      const storedMetrics: LayoutDebugNodeMetrics[] = JSON.parse(storedJson)
      const comparisons = this.compareWithStored(storedMetrics)
      
      console.group('[LAYOUT-DEBUG] HERO LAYOUT COMPARISON')
      console.log(`Comparing: ${storedMetrics[0]?.route || 'unknown'} → ${window.location.pathname}`)
      
      comparisons.forEach(comparison => {
        console.log(`\n${comparison.nodeId}:`)
        console.log(`  Position Δ: ${comparison.deltas.left},${comparison.deltas.top}`)
        console.log(`  Size Δ: ${comparison.deltas.width}x${comparison.deltas.height}`)
        
        if (Math.abs(comparison.deltas.left) > 5 || Math.abs(comparison.deltas.top) > 5) {
          console.warn(`  ⚠️ CRITICAL POSITION MISMATCH`)
        }
        if (Math.abs(comparison.deltas.width) > 10 || Math.abs(comparison.deltas.height) > 10) {
          console.warn(`  ⚠️ CRITICAL SIZE MISMATCH`)
        }
        
        if (comparison.styleDiffs.length > 0) {
          console.log(`  Style differences:`)
          comparison.styleDiffs.forEach(diff => {
            console.log(`    ${diff.property}: "${diff.editorValue}" → "${diff.publicValue}"`)
          })
        }
        
        if (comparison.datasetDiffs.length > 0) {
          console.log(`  Dataset differences:`)
          comparison.datasetDiffs.forEach(diff => {
            console.log(`    ${diff.key}: "${diff.editorValue}" → "${diff.publicValue}"`)
          })
        }
      })
      
      console.groupEnd()
      return comparisons
    } catch (error) {
      console.error('[LAYOUT-DEBUG] Error comparing layouts:', error)
      return []
    }
  }

  exportMetrics(): string {
    const metrics = Array.from(this.metrics.values())
    
    // Store in sessionStorage for comparison
    sessionStorage.setItem('layoutDebugComparison', JSON.stringify(metrics))
    console.log('[LAYOUT-DEBUG] Metrics stored in sessionStorage for comparison')
    
    return JSON.stringify(metrics, null, 2)
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  new LayoutDebugGlobal()
}

export {} // TypeScript module export