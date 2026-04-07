import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('t4t-editor-auth')

    if (!authCookie || authCookie.value !== 'authorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!VERCEL_DEPLOY_HOOK) {
      return NextResponse.json(
        { error: 'Vercel deploy hook not configured. Add VERCEL_DEPLOY_HOOK to your .env.local and Vercel project settings.' },
        { status: 500 }
      )
    }

    const res = await fetch(VERCEL_DEPLOY_HOOK, {
      method: 'POST',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error: 'Deploy hook failed', details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Deploy triggered successfully' })
  } catch (error) {
    console.error('Deploy error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
