import { NextResponse } from 'next/server'
import { createAuthenticatedClient, getAuthenticatedUser } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: { recordId?: string[] } }
) {
  // 1. Extract user from session — NOT from query params
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  // 2. Resolve storage path from catch-all segments
  const recordSegments = params.recordId || []
  const filePath = recordSegments.map(decodeURIComponent).join('/')
  const patientId = recordSegments[0]

  if (!filePath) {
    return NextResponse.json({ error: 'Missing Record Path' }, { status: 400 })
  }

  try {
    const supabase = createAuthenticatedClient()

    // 3. Permission Check
    let hasAccess = false

    if (userId === patientId) {
      hasAccess = true
    } else {
      const { data: rpcAccess, error: rpcError } = await supabase.rpc('check_record_access', {
        p_user_id: userId,
        p_record_id: filePath,
        p_type: 'download'
      })
      if (!rpcError && rpcAccess) hasAccess = true
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access Denied or Expired' }, { status: 403 })
    }

    // 4. Generate signed download URL
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'Patient-Files'
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 300) // 5 minutes

    if (signedError || !signedData?.signedUrl) {
       console.error(`[Storage] Signed URL failed for ${filePath}:`, signedError)
       throw signedError || new Error('Failed to generate signed URL')
    }

    // 5. Redirect to signed URL
    return NextResponse.redirect(signedData.signedUrl, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (err: any) {
    console.error('Record Download Error:', err)
    return NextResponse.json({ 
      error: err.message || 'Server Error',
    }, { status: 500 })
  }
}
