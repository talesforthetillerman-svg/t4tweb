import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await request.json().catch(() => null)
    return NextResponse.json({ success: true, message: "Editor access is open; password gate removed." })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
