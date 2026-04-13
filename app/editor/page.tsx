import { draftMode } from 'next/headers'
import HomePage from "../home-page"

export default async function EditorPage() {
  // Enable Draft Mode to fetch drafts from Sanity
  const draft = await draftMode()
  draft.enable()

  // Render editor with previewDrafts perspective
  // VisualEditorProvider on client will detect /editor route and activate editing mode
  // The client will load editor state separately after hydration
  return <HomePage perspective="previewDrafts" isEditorRoute={true} />
}
