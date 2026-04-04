import { getAuth } from 'firebase/auth'

const ANOMALY_SERVICE_URL = 'https://fincoach-app-production.up.railway.app'

export async function logClinicalAccess(params: {
  userId: string
  action: 'READ' | 'WRITE' | 'SHARE' | 'DELETE' | 'EXPORT'
  resourceCount: number
  resourceType: string
}) {
  const auth = getAuth()
  const token = await auth.currentUser?.getIdToken()
  const hour = new Date().getHours()

  await fetch(`${ANOMALY_SERVICE_URL}/api/anomaly/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      user_id: auth.currentUser?.uid,
      action: params.action,
      ip_address: 'client',
      resource_count: params.resourceCount,
      hour_of_day: hour,
      is_off_hours: hour < 7 || hour > 20,
      request_rate: 1.0
    })
  })
}
