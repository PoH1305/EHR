import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { otpStore } from '@/lib/otpStore'

export async function POST(req: Request) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone is required' }, { status: 400 })

    // 1. Generate a random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 2. Store it with a 5-minute expiry
    otpStore.set(phone, { 
      code, 
      expires: Date.now() + 5 * 60 * 1000 
    })

    console.log(`\n[EHI PLATFORM AUTH] 🛡️`)
    console.log(`PHONE: ${phone}`)
    console.log(`OTP CODE: ${code}`)
    console.log(`EXPIRE: 5 minutes\n`)

    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const fromPhone = process.env.TWILIO_PHONE_NUMBER // Note: Messaging API uses a phone number

    // 3. Optional: Send real SMS if Twilio "Messaging" keys are provided
    if (sid && token && fromPhone) {
      const client = twilio(sid, token)
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`
      
      await client.messages.create({
        body: `Your EHI Platform verification code is: ${code}. Valid for 5 minutes.`,
        from: fromPhone,
        to: formattedPhone
      })
      return NextResponse.json({ success: true, message: 'SMS sent' })
    }

    // 4. Fallback for testing
    return NextResponse.json({ 
      success: true, 
      message: 'OTP generated. Check server console for the code!'
    })
  } catch (error) {
    console.error('OTP Generation Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate OTP'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
