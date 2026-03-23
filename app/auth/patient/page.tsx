'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'

type Step = 'PHONE' | 'OTP' | 'DONE'

export default function PatientAuthPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('PHONE')
  const { setSessionState, updateLastActive, patient, _hasHydrated } = useUserStore()

  // Fast Login: If profile already exists, skip to authenticated
  useEffect(() => {
    if (_hasHydrated && patient && step === 'PHONE') {
      setSessionState('AUTHENTICATED')
      updateLastActive()
      setStep('DONE')
      setTimeout(() => router.replace('/dashboard'), 1500)
    }
  }, [_hasHydrated, patient, step, setSessionState, updateLastActive, router])

  // Form State
  const [phone, setPhone] = useState('')
  const [ehiId, setEhiId] = useState('')
  const [otp, setOtp] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) return
    setIsProcessing(true)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')

      setStep('OTP')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP'
      alert(`OTP Error: ${message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) return
    setIsProcessing(true)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Invalid OTP')

      // OTP verified — authenticate immediately
      setSessionState('AUTHENTICATED')
      useUserStore.getState().setRole('patient')
      updateLastActive()
      setStep('DONE')

      // If new user → onboarding, returning user → dashboard
      const destination = patient ? '/dashboard' : '/onboarding'
      setTimeout(() => router.replace(destination), 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid OTP'
      alert(`Verification Error: ${message}`)
    } finally {
      setIsProcessing(false)
    }
  }

return (
  <div className="flex-1 flex flex-col pt-12 pb-6 px-6 sm:px-12 max-w-md mx-auto w-full">
    <div className="w-10 h-10 rounded-[11px] bg-[#0D7377] flex items-center justify-center text-white font-bold text-sm mb-10">
      EHI
    </div>

    <AnimatePresence mode="wait">
      {step === 'PHONE' && (
        <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
          <h1 className="text-3xl font-medium text-[#E2EAF0] leading-tight mb-10">Enter your<br />number.</h1>
          <form onSubmit={handlePhoneSubmit} className="flex-1 flex flex-col">
            <div className="space-y-8">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#354A5A] font-semibold">Mobile</label>
                <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 mt-2">
                  <span className="text-sm text-[#4A6075]">🇮🇳 +91</span>
                  <input autoFocus type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} className="bg-transparent border-none outline-none text-base text-[#E2EAF0] flex-1 tracking-wider" placeholder="98765 43210" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#354A5A] font-semibold">EHI ID <span className="text-[#2A3D4D] lowercase tracking-normal">(optional)</span></label>
                <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 mt-2">
                  <input type="text" value={ehiId} onChange={e => setEhiId(e.target.value.toUpperCase())} className="bg-transparent border-none outline-none text-base text-[#E2EAF0] flex-1 tracking-wider" placeholder="EHI-XXXX-XXXX" />
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <button disabled={phone.length < 10 || isProcessing} className="w-full py-3.5 rounded-xl bg-[#0D7377] text-white font-medium text-sm disabled:opacity-50 mt-10">
              {isProcessing ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="flex justify-center gap-1.5 mt-5">
              <div className="w-3.5 h-1.5 rounded-full bg-[#0D7377]" /><div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" />
            </div>
          </form>
        </motion.div>
      )}

      {step === 'OTP' && (
        <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
          <h1 className="text-3xl font-medium text-[#E2EAF0] leading-tight">Check your<br />messages.</h1>
          <p className="text-xs text-[#4A6075] mt-2">+91 {phone.slice(0, 5)} •••••</p>
          <form onSubmit={handleOtpSubmit} className="flex-1 flex flex-col mt-10">
            <input autoFocus type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} className="bg-[#111820] border border-[#0D7377] rounded-2xl p-4 text-center text-2xl text-white tracking-[0.5em] outline-none focus:border-[#14A69C] shadow-lg shadow-[#0D7377]/5" />
            <p className="text-[10px] text-[#354A5A] text-right mt-3 font-medium">Resend in 00:42</p>
            <div className="flex-1" />
            <button disabled={otp.length !== 6 || isProcessing} className="w-full py-3.5 rounded-xl bg-[#0D7377] text-white font-medium text-sm disabled:opacity-50 mt-10">
              {isProcessing ? 'Verifying...' : 'Verify'}
            </button>
            <div className="flex justify-center gap-1.5 mt-5">
              <div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" /><div className="w-3.5 h-1.5 rounded-full bg-[#0D7377]" />
            </div>
          </form>
        </motion.div>
      )}

      {step === 'DONE' && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full border-[1.5px] border-[#0D7377] flex items-center justify-center text-[#0D7377] mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Authenticated</h2>
          <p className="text-[10px] text-[#4A6075] tracking-widest uppercase mt-1">Redirecting to Dashboard</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)
}
