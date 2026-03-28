import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { db_firestore } from '@/lib/firebase'
import { doc, deleteDoc } from 'firebase/firestore'

export async function POST(request: Request) {
  try {
    const { uid, role } = await request.json()

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized: Only clinical accounts can be deleted via this portal' }, { status: 403 })
    }

    // 1. Delete from Supabase Profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', uid)

    if (profileError) {
      console.warn('[DeleteAccount] Supabase Profile deletion warning:', profileError)
    }

    // 2. Delete Permissions & Access Requests
    const { error: permError } = await supabase
      .from('record_access_permissions')
      .delete()
      .eq('doctor_id', uid)
    
    if (permError) console.warn('[DeleteAccount] Supabase Permissions deletion warning:', permError)

    const { error: reqError } = await supabase
      .from('access_requests')
      .delete()
      .eq('doctor_id', uid)
    
    if (reqError) console.warn('[DeleteAccount] Supabase Requests deletion warning:', reqError)

    // 3. Delete Audit Logs (Medical Records associated with the doctor)
    const { error: auditError } = await supabase
      .from('medical_records')
      .delete()
      .eq('user_id', uid)

    if (auditError) console.warn('[DeleteAccount] Supabase Audit deletion warning:', auditError)

    // 4. Delete from Firestore
    if (db_firestore) {
      const docRef = doc(db_firestore, 'doctors', uid)
      await deleteDoc(docRef)
    }

    return NextResponse.json({ success: true, message: 'Doctor clinical identity erased across all systems' })

  } catch (error: any) {
    console.error('[DeleteAccount] Global failure:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
