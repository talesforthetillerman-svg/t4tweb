import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Enable Draft Mode for Sanity Presentation.
 * Called by Sanity when entering visual editing mode.
 *
 * Usage: POST /api/draft/enable?slug=/ (Presentation will include the slug)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug') || '/'

    // Enable draft mode
    const draft = await draftMode()
    draft.enable()

    console.log('[draft/enable] Draft mode enabled for slug:', slug)

    // Redirect to the requested page in draft mode
    redirect(slug)
  } catch (error) {
    console.error('[draft/enable] Error:', error)
    return new Response('Failed to enable draft mode', { status: 500 })
  }
}
