import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { auditId, doctorId, extensionReason } = await req.json()

    if (!auditId || !doctorId || !extensionReason) {
      return NextResponse.json({ error: 'Missing extension parameters' }, { status: 400 })
    }

    // 1. Check if already extended (one-time only constraint)
    // 2. Add 30 minutes to existing expiry
    const newExpiry = new Date()
    newExpiry.setMinutes(newExpiry.getMinutes() + 30)
    
    return NextResponse.json({
      success: true,
      newExpiresAt: newExpiry.toISOString(),
      auditType: 'EMERGENCY_ACCESS_EXTENDED'
    })

  } catch (error) {
    console.error('Emergency Extension Error:', error)
    return NextResponse.json({ error: 'Failed to extend emergency access' }, { status: 500 })
  }
}
