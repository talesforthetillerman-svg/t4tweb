"use client"

import { useEffect } from 'react'

export function LayoutDebugInjector() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('layoutDebug')) return
    
    // Dynamically import the debug script
    import('@/lib/layout-debug-global')
      .then(() => {
        console.log('[LAYOUT-DEBUG] Debug system injected successfully')
        
        // Auto-measure after a short delay to ensure DOM is ready
        setTimeout(() => {
          if ((window as any).__LAYOUT_DEBUG__) {
            (window as any).__LAYOUT_DEBUG__.measureAll()
            
            // Export current metrics to console
            const metrics = (window as any).__LAYOUT_DEBUG__.export()
            console.log('[LAYOUT-DEBUG] Current metrics exported. Copy this to compare with other route.')
            
            // Instructions for comparison
            console.log(`
📋 INSTRUCTIONS FOR LAYOUT COMPARISON:
1. Open /editor?layoutDebug=1 in one tab
2. Open /?layoutDebug=1 in another tab
3. In EACH tab, run in console:
   window.__LAYOUT_DEBUG__.export()
4. Copy the JSON output from each tab
5. Compare the metrics manually or use:
   window.compareHeroLayout()
   
The system automatically stores metrics in sessionStorage.
After visiting both routes, you can run:
   window.compareHeroLayout()
to see a detailed comparison.
            `)
          }
        }, 1000)
      })
      .catch(error => {
        console.error('[LAYOUT-DEBUG] Failed to inject debug system:', error)
      })
  }, [])

  return null
}