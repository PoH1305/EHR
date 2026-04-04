import { NextResponse } from 'next/server'
import { createAuthenticatedClient, getAuthenticatedUser } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: { recordId: string } }
) {
  const recordId = params.recordId

  // 1. Extract user from session — NOT from query params
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  try {
    const supabase = createAuthenticatedClient()

    // 2. Permission Check via RPC
    const { data: hasAccess, error: rpcError } = await supabase.rpc('check_record_access', {
      p_user_id: userId,
      p_record_id: recordId,
      p_type: 'download'
    })

    if (rpcError) throw rpcError

    if (!hasAccess) {
       // Check if specifically expired to provide a clear message
       const { data: perm } = await supabase
         .from('record_access_permissions')
         .select('expires_at, is_revoked')
         .match({ doctor_id: userId, record_id: recordId, permission_type: 'download' })
         .single()

       if (perm && new Date(perm.expires_at) <= new Date()) {
         return NextResponse.json({ error: 'Access Expired' }, { status: 403 })
       }

       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Generate signed download URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from('Patient-Files')
      .createSignedUrl(recordId, 300) // 5 minutes

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error('Failed to generate signed URL')
    }

    // 4. Force Download via redirect to signed URL
    return NextResponse.redirect(signedData.signedUrl, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (err: any) {
    console.error('Record Download Error:', err)
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 })
  }
}
