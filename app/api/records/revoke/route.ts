import { NextResponse } from 'next/server'
import { createAuthenticatedClient, getAuthenticatedUser } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  // 1. Authenticate via session cookies
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { permissionId, recordId, doctorId } = await request.json()

    if (!permissionId && (!recordId || !doctorId)) {
      return NextResponse.json({ error: 'Missing Required Parameters' }, { status: 400 })
    }

    const supabase = createAuthenticatedClient()

    // 2. Revoke the permission (RLS ensures only the patient who owns the permission can update it)
    const query = supabase
      .from('record_access_permissions')
      .update({ is_revoked: true })

    if (permissionId) {
      void query.eq('id', permissionId)
    } else {
      void query.match({ record_id: recordId, doctor_id: doctorId })
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Access Revoked' })
  } catch (err: any) {
    console.error('Revoke Error:', err)
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 })
  }
}
