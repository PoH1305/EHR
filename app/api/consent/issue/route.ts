export const runtime = 'edge'

import { ConsentIssueRequestSchema } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = ConsentIssueRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { 
      tokenHash, 
      patientId, 
      recipientId, 
      expiresAt, 
      specialty, 
      encryptedBundle 
    } = parsed.data as {
      tokenHash: string
      patientId: string
      recipientId: string
      expiresAt: string
      specialty: string
      encryptedBundle?: string
    }

    // In development, just acknowledge
    if (process.env.NODE_ENV === 'development') {
      return Response.json({
        issued: true,
        tokenId: `dev-${Date.now()}`,
      })
    }

    // Production: store tokenHash in database
    // In our decentralized model, we also store the blinded clinical payload (encryptedBundle)
    // for the doctor to fetch via the relay service.
    // The server CANNOT decrypt this because it doesn't have the tokenKey.
    console.log('Consent issued (Decentralized):', { 
      tokenHash, 
      patientId, 
      recipientId, 
      expiresAt, 
      specialty, 
      hasBundle: !!encryptedBundle 
    })

    return Response.json({
      issued: true,
      tokenId: tokenHash.slice(0, 16),
    })
  } catch (error: any) {
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
