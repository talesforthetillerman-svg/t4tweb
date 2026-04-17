import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Disable Draft Mode for Sanity Presentation.
 * Called by Sanity when exiting visual editing mode.
 *
 * Usage: POST /api/draft/disable?slug=/ (Presentation will include the slug)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug') || '/'

    // Disable draft mode
    const draft = await draftMode()
    draft.disable()

    console.log('[draft/disable] Draft mode disabled for slug:', slug)

    // Redirect to the requested page (in published mode)
    redirect(slug)
  } catch (error) {
    console.error('[draft/disable] Error:', error)
    return new Response('Failed to disable draft mode', { status: 500 })
  }
}
