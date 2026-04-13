import { draftMode } from 'next/headers'
import { loadHeroData, type HeroData } from './hero-loader'

/**
 * Load hero data with automatic draft mode support.
 * Uses the current draft mode state to determine which perspective to fetch from.
 */
export async function loadHeroDataWithDraft(): Promise<HeroData> {
  const draft = await draftMode()
  const perspective = draft.isEnabled ? 'drafts' : 'published'

  console.log('[loadHeroDataWithDraft] Loading with perspective:', perspective)

  return loadHeroData(perspective)
}
