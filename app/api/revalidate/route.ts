import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  const secret =
    req.headers.get('x-webhook-secret') ||
    req.headers.get('Authorization')?.replace('Bearer ', '') ||
    ''
  const expected = process.env.SANITY_REVALIDATE_SECRET

  if (!expected || secret !== expected) {
    console.log('[revalidate] Unauthorized', { secret: !!secret, expected: !!expected })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  revalidatePath('/')
  console.log('[revalidate] Success')
  return Response.json({ revalidated: true, now: Date.now() })
}

// Sanity sometimes sends GET for webhook testing
export async function GET() {
  return Response.json({ status: 'ok', endpoint: '/api/revalidate' })
}
