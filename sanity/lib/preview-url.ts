/**
 * Get the preview URL for Sanity Presentation tool.
 * Supports local development and production.
 */
export function getPreviewUrl(): string {
  if (process.env.SANITY_PREVIEW_URL) {
    return process.env.SANITY_PREVIEW_URL
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://talesforthetillerman.com'
  }

  // Development: use localhost with port 3000
  // Sanity Presentation will append ?_draft=true to this URL
  return 'http://localhost:3000'
}
