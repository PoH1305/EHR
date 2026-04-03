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
    // 1. Check Permission via RPC
    const { data: hasAccess, error: rpcError } = await supabase.rpc('check_record_access', {
      p_user_id: userId,
      p_record_id: recordId,
      p_type: 'view'
    })

    if (rpcError) throw rpcError
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access Denied or Expired' }, { status: 403 })
    }

    // 2. Get file metadata to find the path (assuming recordId is the ID in some table or the path itself)
    // In our system, the attachment in ClinicalStore usually contains fileUrl or storagePath.
    // If recordId is the filename/path in storage:
    const filePath = recordId // This needs to be correctly passed from the frontend

    // 3. Download from Storage
    const { data, error: downloadError } = await supabase.storage
      .from('medvault-records')
      .download(filePath)

    if (downloadError) throw downloadError

    // 4. Determine MIME Type
    const contentType = data.type || 'application/octet-stream'

    // 5. Stream Response
    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('Record View Error:', err)
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 })
  }
}
