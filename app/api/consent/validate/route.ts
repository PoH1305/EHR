export const runtime = 'edge'

import { z } from 'zod'

const ValidateSchema = z.object({
  tokenHash: string(),
  recipientId: string().optional()
})

function string() { return z.string() }

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = ValidateSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { tokenHash, recipientId } = parsed.data

    // In production, query the DB for the tokenHash
    // and check if it has expired and matches recipientId if provided.
    
    // DEMO LOGIC:
    const isValid = !tokenHash.includes('expired')
    const ttl = isValid ? 3600 : 0

    return Response.json({
      valid: isValid,
      expiresIn: ttl,
      specialty: 'Emergency', // This would come from DB
      patientId: 'pat-123'    // This would come from DB
    })
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
