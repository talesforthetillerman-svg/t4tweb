import { draftMode } from 'next/headers'
import HomePage from "../home-page"

export default async function EditorPage() {
  // Enable Draft Mode to fetch drafts from Sanity
  const draft = await draftMode()
  draft.enable()

  // Load editor state from previewDrafts perspective to show draft content
  // VisualEditorProvider will detect /editor route and activate editor based on pathname
  return <HomePage perspective="previewDrafts" />
}
