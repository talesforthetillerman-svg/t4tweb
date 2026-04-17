export interface LayoutDebugMetrics {
  nodeId: string
  route: string
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
    textAlign: string
    backgroundImage: string
    color: string
    fontSize: string
    lineHeight: string
    letterSpacing: string
    position: string
    display: string
    margin: string
    padding: string
    border: string
  }
  dataset: {
    x?: string
    y?: string
    width?: string
    height?: string
    textAlign?: string
  }
  persistedData?: {
    x?: number
    y?: number
    width?: number
    height?: number
    textAlign?: string
    color?: string
    gradient?: string
  }
}

export function measureNodeLayout(nodeId: string, persistedData?: any): LayoutDebugMetrics {
  const element = document.getElementById(nodeId)
  if (!element) {
    console.warn(`[LAYOUT-DEBUG] Element with id "${nodeId}" not found`)
    return {
      nodeId,
      route: window.location.pathname,
      rect: { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 },
      computedStyle: {
        transform: '',
        transformOrigin: '',
        textAlign: '',
        backgroundImage: '',
        color: '',
        fontSize: '',
        lineHeight: '',
        letterSpacing: '',
        position: '',
        display: '',
        margin: '',
        padding: '',
        border: ''
      },
      dataset: {},
      persistedData
    }
  }

  const rect = element.getBoundingClientRect()
  const computed = window.getComputedStyle(element)

  return {
    nodeId,
    route: window.location.pathname,
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
      textAlign: computed.textAlign,
      backgroundImage: computed.backgroundImage,
      color: computed.color,
      fontSize: computed.fontSize,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      position: computed.position,
      display: computed.display,
      margin: computed.margin,
      padding: computed.padding,
      border: computed.border
    },
    dataset: {
      x: element.dataset.editorGeometryX,
      y: element.dataset.editorGeometryY,
      width: element.dataset.editorGeometryWidth,
      height: element.dataset.editorGeometryHeight,
      textAlign: element.dataset.editorTextAlign
    },
    persistedData
  }
}

export function logLayoutComparison(editorMetrics: LayoutDebugMetrics, publicMetrics: LayoutDebugMetrics) {
  const deltaLeft = publicMetrics.rect.left - editorMetrics.rect.left
  const deltaTop = publicMetrics.rect.top - editorMetrics.rect.top
  const deltaWidth = publicMetrics.rect.width - editorMetrics.rect.width
  const deltaHeight = publicMetrics.rect.height - editorMetrics.rect.height

  console.group(`[LAYOUT-DEBUG] ${editorMetrics.nodeId} - EDITOR vs PUBLIC`)
  console.log('ROUTE:', editorMetrics.route, 'vs', publicMetrics.route)
  
  console.log('RECT:')
  console.table({
    Editor: editorMetrics.rect,
    Public: publicMetrics.rect,
    Delta: { left: deltaLeft, top: deltaTop, width: deltaWidth, height: deltaHeight }
  })

  console.log('COMPUTED STYLE DIFFS:')
  const styleKeys = Object.keys(editorMetrics.computedStyle) as Array<keyof LayoutDebugMetrics['computedStyle']>
  styleKeys.forEach(key => {
    const editorVal = editorMetrics.computedStyle[key]
    const publicVal = publicMetrics.computedStyle[key]
    if (editorVal !== publicVal) {
      console.log(`  ${key}: "${editorVal}" vs "${publicVal}"`)
    }
  })

  console.log('DATASET DIFFS:')
  const datasetKeys = Object.keys(editorMetrics.dataset) as Array<keyof LayoutDebugMetrics['dataset']>
  datasetKeys.forEach(key => {
    const editorVal = editorMetrics.dataset[key]
    const publicVal = publicMetrics.dataset[key]
    if (editorVal !== publicVal) {
      console.log(`  ${key}: "${editorVal}" vs "${publicVal}"`)
    }
  })

  console.log('PERSISTED DATA:', editorMetrics.persistedData)
  console.groupEnd()
}

export function measureAllCriticalNodes(persistedDataMap?: Record<string, any>) {
  const criticalNodeIds = [
    'hero-section',
    'hero-title',
    'hero-subtitle',
    'hero-logo',
    'hero-bg-image',
    'intro-banner-gif'
  ]

  const metrics = criticalNodeIds.map(nodeId => {
    const persistedData = persistedDataMap?.[nodeId]
    return measureNodeLayout(nodeId, persistedData)
  })

  console.group('[LAYOUT-DEBUG] ALL CRITICAL NODES')
  metrics.forEach(m => {
    console.log(`\n${m.nodeId}:`)
    console.log(`  Position: ${m.rect.left},${m.rect.top} Size: ${m.rect.width}x${m.rect.height}`)
    console.log(`  Transform: ${m.computedStyle.transform || '(none)'}`)
    console.log(`  TextAlign: ${m.computedStyle.textAlign}`)
    console.log(`  Dataset: x=${m.dataset.x}, y=${m.dataset.y}, w=${m.dataset.width}, h=${m.dataset.height}`)
  })
  console.groupEnd()

  return metrics
}