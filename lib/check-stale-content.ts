/**
 * Helper script to check what the public vs editor are rendering
 * Run from browser console after making changes in editor
 */

export function capturePublicState() {
  const publicWindow = window.open('/', '_blank')
  setTimeout(() => {
    console.log('Public window opened, refresh after editor changes to compare')
  }, 1000)
}

/**
 * Trace what each loader returns
 */
export async function traceLadersPublished() {
  const baseUrl = new URL(window.location.origin)

  console.log('\n=== CHECKING PUBLISHED PERSPECTIVE ===')

  // This would need to be called from a server component or API route
  // For now, you can check the network tab when loading /
  console.log('Check the network tab when loading / to see:')
  console.log('1. Hero data returned by loadHeroData')
  console.log('2. Navigation data returned by loadNavigationData')
  console.log('3. Intro banner data returned by loadIntroBannerData')
  console.log('')
  console.log('Then compare with /editor to see if editor state differs from published')
}

/**
 * Check deploy endpoint response for hints
 */
export async function checkLastDeploy() {
  console.log('\n=== CHECKING LAST DEPLOY RESPONSE ===')
  console.log('When you save from /editor, check:')
  console.log('1. POST /api/editor-deploy response status: should be "ok" or "partial"')
  console.log('2. If "partial": see which nodes failed (persistenceIssues.failed)')
  console.log('3. Check publicRevalidateUrlConfigured: should be false locally')
  console.log('4. Check localRevalidateOk: should be true')
  console.log('')
  console.log('If status is "partial" or some nodes failed, the write to Sanity may have issues')
}
