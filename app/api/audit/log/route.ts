export const runtime = 'edge'

import { AuditLogRequestSchema } from '@/lib/types'
import { sha256 } from '@/lib/crypto'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = AuditLogRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const event = parsed.data

    // Verify hash integrity — destructure out hash and previousHash, keep rest
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hash: storedHash, previousHash: _ph, ...fields } = event
    const sortedFields = JSON.stringify(fields, Object.keys(fields).sort())
    const computedHash = await sha256(`${event.previousHash}:${sortedFields}`)

    if (computedHash !== storedHash) {
      return Response.json(
        { error: 'TAMPERED_AUDIT_EVENT' },
        { status: 400 }
      )
    }

    // In development, just acknowledge
    if (process.env.NODE_ENV === 'development') {
      return Response.json({
        logged: true,
        eventId: event.id,
      })
    }

    // Production: store to audit DB
    console.log('Audit event logged:', event.id, event.type)

    return Response.json({
      logged: true,
      eventId: event.id,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
