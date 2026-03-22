import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { patientId, doctorId, reason, durationPreset } = await req.json()

    if (!patientId || !doctorId || !reason || !durationPreset) {
      return NextResponse.json({ error: 'Missing required emergency parameters' }, { status: 400 })
    }

    if (reason.length < 10) {
      return NextResponse.json({ error: 'Emergency reason must be at least 10 characters' }, { status: 400 })
    }

    // 1. Calculate expiry
    const now = new Date()
    let expiresAt = new Date()
    if (durationPreset === '30min') expiresAt.setMinutes(now.getMinutes() + 30)
    else if (durationPreset === '4hr') expiresAt.setHours(now.getHours() + 4)
    else if (durationPreset === 'until_merge') expiresAt.setFullYear(now.getFullYear() + 1) // Long default for temp
    else return NextResponse.json({ error: 'Invalid duration preset' }, { status: 400 })

    // 2. Create Audit Entry (EMERGENCY_ACCESS_TRIGGERED)
    // In a real app, this would be a separate server-side call.
    // For the demo, we'll return the success and the client will log via useAuditStore.
    
    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      auditId: `EMG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    })

  } catch (error) {
    console.error('Emergency Trigger Error:', error)
    return NextResponse.json({ error: 'Failed to trigger emergency access' }, { status: 500 })
  }
}
