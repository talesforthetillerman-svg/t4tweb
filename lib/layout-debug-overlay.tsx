/**
 * Layout Debug Overlay - Visual overlay for debugging layout differences
 */

"use client"

import { useEffect, useState } from 'react'
import { measureAllCriticalNodes, type LayoutDebugMetrics } from './layout-debug'

interface DebugOverlayProps {
  elementStyles?: Record<string, Record<string, unknown>>
}

export function LayoutDebugOverlay({ elementStyles }: DebugOverlayProps) {
  const [measurements, setMeasurements] = useState<Array<{
    nodeId: string
    rect: DOMRect
    dataset: Record<string, string | null>
  }>>([])
  const [debugMetrics, setDebugMetrics] = useState<LayoutDebugMetrics[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('layoutDebug')) return

    const measure = () => {
      const nodeIds = ['hero-title', 'hero-subtitle', 'hero-logo', 'hero-bg-image', 'intro-banner-gif']
      const newMeasurements: Array<{
        nodeId: string
        rect: DOMRect
        dataset: Record<string, string | null>
      }> = []

      nodeIds.forEach(nodeId => {
        const element = document.querySelector(`[data-editor-node-id="${nodeId}"]`)
        if (element) {
          const rect = element.getBoundingClientRect()
          const dataset = {
            geometryX: element.getAttribute('data-editor-geometry-x'),
            geometryY: element.getAttribute('data-editor-geometry-y'),
            geometryWidth: element.getAttribute('data-editor-geometry-width'),
            geometryHeight: element.getAttribute('data-editor-geometry-height'),
            textAlign: element.getAttribute('data-editor-text-align'),
            scale: element.getAttribute('data-editor-scale'),
          }
          newMeasurements.push({ nodeId, rect, dataset })
        }
      })

      setMeasurements(newMeasurements)
      
      // Detailed console logging
      const metrics = measureAllCriticalNodes()
      setDebugMetrics(metrics)
      
      // Log detailed comparison if we have previous metrics from other route
      const storedMetrics = sessionStorage.getItem('layoutDebugMetrics')
      if (storedMetrics) {
        try {
          const previousMetrics: LayoutDebugMetrics[] = JSON.parse(storedMetrics)
          const previousRoute = previousMetrics[0]?.route
          const currentRoute = window.location.pathname
          
          if (previousRoute !== currentRoute) {
            console.group(`[LAYOUT-DEBUG] ROUTE COMPARISON: ${previousRoute} → ${currentRoute}`)
            metrics.forEach(currentMetric => {
              const previousMetric = previousMetrics.find(m => m.nodeId === currentMetric.nodeId)
              if (previousMetric) {
                const deltaLeft = currentMetric.rect.left - previousMetric.rect.left
                const deltaTop = currentMetric.rect.top - previousMetric.rect.top
                const deltaWidth = currentMetric.rect.width - previousMetric.rect.width
                const deltaHeight = currentMetric.rect.height - previousMetric.rect.height
                
                console.log(`\n${currentMetric.nodeId}:`)
                console.log(`  Position Δ: ${deltaLeft},${deltaTop} (${previousMetric.rect.left},${previousMetric.rect.top} → ${currentMetric.rect.left},${currentMetric.rect.top})`)
                console.log(`  Size Δ: ${deltaWidth}x${deltaHeight} (${previousMetric.rect.width}x${previousMetric.rect.height} → ${currentMetric.rect.width}x${currentMetric.rect.height})`)
                console.log(`  TextAlign: ${previousMetric.computedStyle.textAlign} → ${currentMetric.computedStyle.textAlign}`)
                console.log(`  Transform: ${previousMetric.computedStyle.transform || '(none)'} → ${currentMetric.computedStyle.transform || '(none)'}`)
                
                // Check for critical misalignment
                if (Math.abs(deltaLeft) > 5 || Math.abs(deltaTop) > 5) {
                  console.warn(`  ⚠️ CRITICAL MISALIGNMENT: Δ=${deltaLeft},${deltaTop}`)
                }
              }
            })
            console.groupEnd()
          }
        } catch (e) {
          console.error('Error parsing stored metrics:', e)
        }
      }
      
      // Store current metrics for comparison
      sessionStorage.setItem('layoutDebugMetrics', JSON.stringify(metrics))
    }

    // Initial measurement
    measure()

    // Re-measure on resize and scroll
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure)

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [])

  if (measurements.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {measurements.map(({ nodeId, rect, dataset }) => (
        <div
          key={nodeId}
          className="absolute border-2 border-red-500 bg-red-500/10"
          style={{
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {nodeId}
            {dataset.geometryX && dataset.geometryY && (
              <span className="ml-2">
                📍 {dataset.geometryX},{dataset.geometryY}
              </span>
            )}
          </div>
          <div className="absolute -bottom-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            {Math.round(rect.width)}×{Math.round(rect.height)}
          </div>
        </div>
      ))}
      
      {/* Info panel */}
      <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-sm max-w-md pointer-events-auto">
        <div className="font-bold mb-2">📐 Layout Debug Overlay</div>
        <div className="space-y-1">
          {measurements.map(({ nodeId, rect, dataset }) => (
            <div key={nodeId} className="border-b border-white/20 pb-1">
              <div className="font-medium">{nodeId}</div>
              <div className="text-xs text-gray-300">
                Position: {Math.round(rect.x)}, {Math.round(rect.y)} | Size: {Math.round(rect.width)}×{Math.round(rect.height)}
              </div>
              {dataset.geometryX && dataset.geometryY && (
                <div className="text-xs text-yellow-300">
                  Persisted: {dataset.geometryX}, {dataset.geometryY}
                  {dataset.geometryWidth && dataset.geometryHeight && (
                    ` | ${dataset.geometryWidth}×${dataset.geometryHeight}`
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Route: {window.location.pathname}
        </div>
      </div>
    </div>
  )
}