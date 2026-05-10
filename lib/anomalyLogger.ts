/**
 * Anomaly Logger — sends clinical access events to the anomaly detection service.
 * Uses Supabase Auth for JWT authentication.
 */

const ANOMALY_SERVICE_URL = 'https://fincoach-app-production.up.railway.app'

export async function logClinicalAccess(params: {
  userId: string
  action: 'READ' | 'WRITE' | 'SHARE' | 'DELETE' | 'EXPORT'
  resourceCount: number
  resourceType: string
}) {
  try {
    const { supabase } = await import('@/lib/supabase')
    if (!supabase) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const token = session.access_token
    const hour = new Date().getHours()

    await fetch(`${ANOMALY_SERVICE_URL}/api/anomaly/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: session.user.id,
        action: params.action,
        ip_address: 'client',
        resource_count: params.resourceCount,
        hour_of_day: hour,
        is_off_hours: hour < 7 || hour > 20,
        request_rate: 1.0
      })
    })
  } catch (err) {
    // Silently fail — anomaly logging should never block the user
    console.warn('[AnomalyLogger] Failed to log access:', err)
  }
}
