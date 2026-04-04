import { NextResponse } from 'next/server'
import { createAuthenticatedClient, getAuthenticatedUser } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  // 1. Authenticate via session cookies — no trusting body params
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = user.id

  try {
    const { role } = await request.json()

    if (role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized: Only clinical accounts can be deleted via this portal' }, { status: 403 })
    }

    const supabase = createAuthenticatedClient()

    // 1. Delete from Supabase Profiles (RLS ensures only own profile)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', uid)

    if (profileError) {
      console.error('[DeleteAccount] Supabase Profile deletion failed:', profileError)
      return NextResponse.json({ error: `Failed to delete Supabase profile: ${profileError.message}` }, { status: 500 })
    }

    // 2. Delete Permissions & Access Requests (RLS scoped to own)
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

    // 3. Audit logs are NEVER deleted — they are immutable by RLS policy

    return NextResponse.json({ success: true, message: 'Clinical identity erased.' })

  } catch (error: any) {
    console.error('[DeleteAccount] Global failure:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
