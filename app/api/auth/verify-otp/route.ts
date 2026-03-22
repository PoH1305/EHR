import { NextResponse } from 'next/server'
import { otpStore } from '@/lib/otpStore'

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()
    if (!phone || !code) return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })

    const entry = otpStore.get(phone)

    if (!entry) {
      return NextResponse.json({ error: 'No OTP found for this number' }, { status: 404 })
    }

    if (Date.now() > entry.expires) {
      otpStore.delete(phone)
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // Master bypass code for testing or specific exceptions
    if (code === '000000') {
      otpStore.delete(phone)
      return NextResponse.json({ success: true, valid: true })
    }

    if (entry.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Success! Clear the OTP and proceed
    otpStore.delete(phone)
    return NextResponse.json({ success: true, valid: true })

  } catch (error) {
    console.error('Custom Verify Error:', error)
    const message = error instanceof Error ? error.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
