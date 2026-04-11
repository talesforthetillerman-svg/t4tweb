import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function EditorPage() {
  // Enable Draft Mode
  const draft = await draftMode()
  draft.enable()

  // Redirect to home with edit mode
  redirect('/?editMode=true')
}
