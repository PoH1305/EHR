import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { permissionId, recordId, doctorId } = await request.json()

    if (!permissionId && (!recordId || !doctorId)) {
      return NextResponse.json({ error: 'Missing Required Parameters' }, { status: 400 })
    }

    // 1. Revoke the permission
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
