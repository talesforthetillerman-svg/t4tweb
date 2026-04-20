import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // This is a server-side endpoint that returns current layout state
  // For now, just return a simple response
  return NextResponse.json({
    message: 'Debug metrics endpoint',
    timestamp: new Date().toISOString(),
    instructions: 'Use ?layoutDebug=1 query param on /editor and / routes for visual debugging'
  })
}