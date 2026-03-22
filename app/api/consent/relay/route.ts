export const runtime = 'edge'

import { z } from 'zod'

const RelaySchema = z.object({
  tokenHash: z.string(),
  bundle: z.string() // The encrypted, base64 clinical bundle
})

// In-memory store for demo (cleared on edge function recycle)
// Production would use Redis/KV with TTL
const BUNDLE_STORE = new Map<string, string>()

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = RelaySchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { tokenHash, bundle } = parsed.data
    
    // Store bundle against tokenHash
    BUNDLE_STORE.set(tokenHash, bundle)
    console.log('Encrypted bundle relayed for token:', tokenHash.slice(0, 8))

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Relay failed' }, { status: 500 })
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('tokenHash')

  if (!tokenHash) {
    return Response.json({ error: 'Missing tokenHash' }, { status: 400 })
  }

  const bundle = BUNDLE_STORE.get(tokenHash)

  if (!bundle) {
    return Response.json({ error: 'Bundle not found or expired' }, { status: 404 })
  }

  // OPTIONAL: Delete after fetch for extra security
  // BUNDLE_STORE.delete(tokenHash)

  return Response.json({ bundle })
}
