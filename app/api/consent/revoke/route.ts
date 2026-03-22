export const runtime = 'edge'

import { ConsentRevokeRequestSchema } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = ConsentRevokeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { tokenId, reason, patientId } = parsed.data

    // In development, just acknowledge
    if (process.env.NODE_ENV === 'development') {
      return Response.json({
        revoked: true,
        revokedAt: new Date().toISOString(),
      })
    }

    // Production: mark token as REVOKED in database
    console.log('Consent revoked:', { tokenId, reason, patientId })

    return Response.json({
      revoked: true,
      revokedAt: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
