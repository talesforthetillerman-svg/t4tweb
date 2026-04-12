import { draftMode } from 'next/headers'
import HomePage from "../home-page"

export default async function EditorPage() {
  // Enable Draft Mode to fetch drafts from Sanity
  const draft = await draftMode()
  draft.enable()

  // Render same page as home - VisualEditorProvider will detect /editor route
  // and activate editor based on pathname === "/editor"
  return <HomePage />
}
