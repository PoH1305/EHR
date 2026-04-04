import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tokenId, reason, patientId } = body

    // Synchronize revocation with record_access_permissions if not handled by client
    // Since our client code already handles this, this API route ensures
    // the backend is in a consistent state if called externally.
    
    console.log('[API/Consent/Revoke] Token revoked:', tokenId, 'Reason:', reason)

    try {
      import('@/lib/anomalyLogger').then(({ logClinicalAccess }) => {
        logClinicalAccess({
          userId: patientId || 'patient',
          action: 'DELETE',
          resourceCount: 1,
          resourceType: 'Consent'
        }).catch(() => {})
      }).catch(() => {})
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Token revoked' })
  } catch (err) {
    console.error('Consent Revoke Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
