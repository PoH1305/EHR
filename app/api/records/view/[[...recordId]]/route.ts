import { NextResponse } from 'next/server'
import { createAuthenticatedClient, getAuthenticatedUser } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: { recordId?: string[] } }
) {
  // 1. Extract user identity from cookies — NEVER from query params
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
    // ALLOW if:
    // a) The authenticated user IS the patient who owns the folder
    // b) The authenticated user is a doctor with a valid 'view' permission
    let hasAccess = false
    let tokenId: string | null = null

    if (userId === patientId) {
      hasAccess = true
    } else {
      const { data: rpcAccess, error: rpcError } = await supabase.rpc('check_record_access', {
        p_user_id: userId,
        p_record_id: filePath,
        p_type: 'view'
      })
      if (!rpcError && rpcAccess) {
        hasAccess = true

        // Resolve consent token for audit logging
        const { data: tokenData } = await supabase
          .from('consent_tokens')
          .select('id')
          .eq('patient_id', patientId)
          .eq('recipient_id', userId)
          .eq('status', 'ACTIVE')
          .limit(1)
          .single()

        tokenId = tokenData?.id || null
      }
    }

    if (!hasAccess) {
      return renderErrorPage('Access Restricted', 'This medical link has expired or you do not have permission to view this record.')
    }

    // 4. Generate Secure Signed URL (1-hour validity)
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'Patient-Files'
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600)

    if (signedError || !signedData?.signedUrl) {
       console.error(`[Storage] Signed URL failed for ${filePath}:`, signedError)
       return renderErrorPage('File Unavailable', 'This record could not be retrieved. It may have been moved or is currently synchronizing.')
    }

    // 5. Log Access for Anomaly Detection
    try {
      import('@/lib/anomalyLogger').then(({ logClinicalAccess }) => {
        logClinicalAccess({
          userId: userId,
          action: 'READ',
          resourceCount: 1,
          resourceType: 'File'
        }).catch(() => {})
      }).catch(() => {})
    } catch (e) {}

    try {
      const viewerType = userId === patientId ? 'patient' : 'doctor'
      await supabase.from('file_access_logs').insert({
        doctor_id: viewerType === 'doctor' ? userId : null,
        patient_id: patientId,
        storage_path: filePath,
        consent_token_id: tokenId,
        viewer_type: viewerType
      })
    } catch (logErr) {
      console.error('[Audit] Failed to log file access:', logErr)
    }

    // 6. Secure Redirect
    return NextResponse.redirect(signedData.signedUrl, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (err: any) {
    console.error('Record View Error:', err)
    return renderErrorPage('Unable to open file', 'Something went wrong while opening this record. Please try again later.')
  }
}

function renderErrorPage(title: string, message: string) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} | MedVault</title>
      <style>
        body { 
          background: #020617; 
          color: white; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .card {
          padding: 40px;
          border-radius: 40px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 400px;
          width: 90%;
        }
        h1 { 
          font-size: 24px; 
          font-weight: 900; 
          letter-spacing: -0.05em; 
          margin: 0 0 12px 0;
        }
        p { 
          color: #94a3b8; 
          font-size: 14px; 
          line-height: 1.6;
          margin: 0 0 32px 0;
        }
        .btn {
          display: inline-block;
          padding: 14px 28px;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 16px;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.2s;
        }
        .btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">Back to Dashboard</a>
      </div>
    </body>
    </html>
  `
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
