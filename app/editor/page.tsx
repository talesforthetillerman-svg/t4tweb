import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function EditorPage() {
  // Check authentication
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('t4t-editor-auth')

  if (!authCookie || authCookie.value !== 'authorized') {
    redirect('/editor/login')
  }

  // Enable Draft Mode
  const draft = await draftMode()
  draft.enable()

  // Redirect to home with edit mode
  redirect('/?editMode=true')
}
