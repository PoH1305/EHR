import { NextResponse } from 'next/server'
import { createAuthenticatedClient, getAuthenticatedUser } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: { recordId: string } }
) {
  const recordId = params.recordId

  // 1. Extract user from session cookies — NOT from query params
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  try {
    const supabase = createAuthenticatedClient()

    // 2. Check Permission via RPC (runs as authenticated user, respects RLS)
    const { data: hasAccess, error: rpcError } = await supabase.rpc('check_record_access', {
      p_user_id: userId,
      p_record_id: recordId,
      p_type: 'view'
    })

    if (rpcError) throw rpcError
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access Denied or Expired' }, { status: 403 })
    }

    // 3. Generate a short-lived signed URL instead of downloading inline
    const { data: signedData, error: signedError } = await supabase.storage
      .from('Patient-Files')
      .createSignedUrl(recordId, 300) // 5 minutes

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error('Failed to generate signed URL')
    }

    // 4. Redirect to signed URL
    return NextResponse.redirect(signedData.signedUrl, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (err: any) {
    console.error('Record View Error:', err)
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 })
  }
}
