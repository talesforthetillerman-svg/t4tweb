import { draftMode } from 'next/headers'
import HomePage from "../home-page"

export default async function EditorPage() {
  // Enable Draft Mode to fetch drafts from Sanity
  const draft = await draftMode()
  draft.enable()

  const timestamp = new Date().toISOString()
  console.log(`[RUNTIME] EditorPage mounted at ${timestamp}`)

  // Render editor with drafts perspective
  // VisualEditorProvider on client will detect /editor route and activate editing mode
  // The client will load editor state separately after hydration
  return (
    <>
      <script dangerouslySetInnerHTML={{__html: `console.log('[RUNTIME] EditorPage HTML received at', new Date().toISOString())`}} />
      <HomePage perspective="drafts" isEditorRoute={true} />
    </>
  )
}
