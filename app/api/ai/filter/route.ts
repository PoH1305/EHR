

import { FilterRequestSchema } from '@/lib/types'
import type { FHIRBundle } from '@/lib/types'
import { filterPatientDataBySpecialty } from '@/lib/aiFilter'
import { db } from '@/lib/db'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = FilterRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { records, specialty, consentTokenId } = parsed.data

    // Production: validate consent token from DB
    // On server (SSR/API), db might be null if it's Dexie (client-side only).
    // In a real decentralized Node, this would check a local server-side store.
    if (!db) {
      return Response.json(
        { error: 'Server-side database not available for this decentralized node' },
        { status: 501 }
      )
    }

    const consent = await db.consent_tokens.get(consentTokenId)
    if (!consent || consent.status !== 'ACTIVE') {
      return Response.json(
        { error: 'Invalid or inactive consent token' },
        { status: 403 }
      )
    }

    const filtered = filterPatientDataBySpecialty(
      records as unknown as FHIRBundle,
      specialty,
      consent
    )

    return Response.json({ filtered })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('expired') || message.includes('not active') ? 401 : 500
    return Response.json({ error: message }, { status })
  }
}
