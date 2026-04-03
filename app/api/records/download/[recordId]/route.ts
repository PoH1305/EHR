import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { recordId: string } }
) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const recordId = params.recordId

  if (!userId) {
    return NextResponse.json({ error: 'Missing User ID' }, { status: 401 })
  }

  try {
    // 1. Permission Check via RPC
    const { data: hasAccess, error: rpcError } = await supabase.rpc('check_record_access', {
      p_user_id: userId,
      p_record_id: recordId,
      p_type: 'download'
    })

    if (rpcError) throw rpcError
    
    // 2. Extra Requirement: If expired, mark as revoked and deny
    if (!hasAccess) {
       // Check if it's specifically expired to auto-revoke
       const { data: perm } = await supabase
         .from('record_access_permissions')
         .select('expires_at, is_revoked')
         .match({ doctor_id: userId, record_id: recordId, permission_type: 'download' })
         .single()

       if (perm && new Date(perm.expires_at) <= new Date()) {
         // Auto-revoke if accessed while expired
         await supabase
           .from('record_access_permissions')
           .update({ is_revoked: true })
           .match({ doctor_id: userId, record_id: recordId, permission_type: 'download' })
         
         return NextResponse.json({ error: 'Access Expired' }, { status: 403 })
       }

       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Download from Storage
    const filePath = recordId
    const { data, error: downloadError } = await supabase.storage
      .from('medvault-records')
      .download(filePath)

    if (downloadError) throw downloadError

    // 4. Force Download Header
    const fileName = filePath.split('/').pop() || 'medical-record'
    return new Response(data, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('Record Download Error:', err)
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 })
  }
}
