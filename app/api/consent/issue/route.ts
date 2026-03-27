import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tokenHash, patientId, recipientId, expiresAt, specialty } = body

    // Optional: Log or mirror the issuance to a central audit log if needed.
    // Since the client already pushes to 'shared_secrets', this can be a lightweight ack
    // or we can use it to maintain a server-side index of tokens.
    
    console.log('[API/Consent/Issue] Token registered:', tokenHash)

    return NextResponse.json({ success: true, message: 'Token issued' })
  } catch (err) {
    console.error('Consent Issue Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
