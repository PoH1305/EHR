import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { recordId?: string[] } }
) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  // 1. Resolve storage path from catch-all segments
  const recordSegments = params.recordId || []
  const filePath = recordSegments.map(decodeURIComponent).join('/')
  const patientId = recordSegments[0]
  const fileName = recordSegments[recordSegments.length - 1] // Fallback filename

  if (!userId) {
    return NextResponse.json({ error: 'Missing User ID' }, { status: 401 })
  }

  if (!filePath) {
    return NextResponse.json({ error: 'Missing Record Path' }, { status: 400 })
  }

  try {
    // 2. Permission Check
    // ALLOW if:
    // a) The requesting user IS the patient who owns the folder
    // b) The requesting user is a doctor with a valid, unexpired 'download' permission record
    let hasAccess = false

    if (userId === patientId) {
      hasAccess = true
    } else {
      const { data: rpcAccess, error: rpcError } = await supabase.rpc('check_record_access', {
        p_user_id: userId,
        p_record_id: filePath, // Check using the full path
        p_type: 'download'
      })
      if (!rpcError && rpcAccess) hasAccess = true
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access Denied or Expired' }, { status: 403 })
    }

    // 3. Download from Storage
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'patient-files'
    const { data, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath)

    if (downloadError) {
       console.error(`[Storage] Download failed for ${filePath} in ${bucket}:`, downloadError)
       throw downloadError
    }

    // 4. Determine MIME Type & Dispositions
    const contentType = data.type || 'application/octet-stream'

    // 5. Stream Response (Attachment for download)
    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('Record Download Error:', err)
    return NextResponse.json({ 
      error: err.message || 'Server Error',
      details: `Bucket: ${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'patient-files'}`
    }, { status: 500 })
  }
}
