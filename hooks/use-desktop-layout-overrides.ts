"use client"

/**
 * Architecture rule:
 * - pública = responsive (no geometry overrides)
 * - editor geometry = only desktop (disabled for now)
 * - público/mobile/tablet = always ignore geometry overrides
 * - no DOM base changes for overlays
 * - una sola caja general = resolved in overlay/routing, not HTML
 *
 * This hook always returns false to ensure:
 * 1. No hydration mismatches (always consistent SSR/client)
 * 2. Responsive layout always preserved
 * 3. No inline geometry styles applied
 */
export function useDesktopLayoutOverridesEnabled(_forceEnable = false): boolean {
  return false
}
