'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { cn } from '@/lib/utils'
import { registerDevice, isBiometricAvailable } from '@/lib/webauthn'
import { generateUUID } from '@/lib/utils'
import { Fingerprint } from 'lucide-react'
import { sha256 } from '@/lib/crypto'

type Step = 'PHONE' | 'OTP' | 'PIN' | 'BIOMETRICS' | 'DONE'

export default function PatientAuthPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('PHONE')
  const { setSessionState, setPatient, updateLastActive } = useUserStore()

  // Form State
  const [phone, setPhone] = useState('')
  const [ehiId, setEhiId] = useState('')
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
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

      setStep('PIN')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid OTP'
      alert(`Verification Error: ${message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePinInput = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num)
  }
  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  useEffect(() => {
    if (pin.length === 4 && step === 'PIN') {
      const finalize = async () => {
        setIsProcessing(true)
        
        const newId = generateUUID()
        const pinHash = await sha256(pin)
        
        const patientData = {
          id: newId,
          healthId: ehiId || `EHI-${phone.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
          name: 'New Patient',
          birthDate: '1990-01-01',
          gender: 'unknown' as const,
          bloodGroup: 'B+',
          createdAt: new Date().toISOString(),
          lastAccessAt: new Date().toISOString(),
          photoUrl: null,
          emergencyContact: { name: 'Emergency Contact', phone: '', relationship: 'Other' },
          biometricsActive: false,
          pinHash
        }

        setPatient(patientData)
        
        const available = await isBiometricAvailable()
        if (available) {
          setIsProcessing(false)
          setStep('BIOMETRICS')
        } else {
          setSessionState('AUTHENTICATED')
          updateLastActive()
          setIsProcessing(false)
          setStep('DONE')
          setTimeout(() => router.replace('/dashboard'), 2000)
        }
      }
      void finalize()
    }
  }, [pin, step, router, setPatient, setSessionState, updateLastActive, ehiId, phone])

const handleBiometricEnroll = async () => {
  const { patient, updatePatient } = useUserStore.getState()
  if (!patient) return

  setIsProcessing(true)
  const success = await registerDevice(patient.id)
  if (success) {
    updatePatient({ biometricsActive: true })
  }

  setSessionState('AUTHENTICATED')
  updateLastActive()
  setIsProcessing(false)
  setStep('DONE')
  setTimeout(() => router.replace('/dashboard'), 2000)
}

const handleBiometricSkip = () => {
  setSessionState('AUTHENTICATED')
  updateLastActive()
  setStep('DONE')
  setTimeout(() => router.replace('/dashboard'), 2000)
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
              <div className="w-3.5 h-1.5 rounded-full bg-[#0D7377]" /><div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" /><div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" />
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
              <div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" /><div className="w-3.5 h-1.5 rounded-full bg-[#0D7377]" /><div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" />
            </div>
          </form>
        </motion.div>
      )}

      {step === 'PIN' && (
        <motion.div key="pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
          <h1 className="text-3xl font-medium text-[#E2EAF0] leading-tight">Almost<br />there.</h1>
          <p className="text-xs text-[#4A6075] mt-2">{isProcessing ? 'Registering Biometrics...' : 'Enter your 4-digit PIN'}</p>

          <div className="flex justify-center gap-4 mt-12 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn("w-3 h-3 rounded-full transition-colors", i < pin.length ? "bg-[#0D7377]" : "bg-white/[0.07]")} />
            ))}
          </div>

          <div className="flex-1" />

          <div className="grid grid-cols-3 gap-3 mt-4 opacity-90">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} onClick={() => handlePinInput(n.toString())} className="bg-[#111820] py-4 rounded-xl text-xl text-white font-medium hover:bg-white/5 active:bg-white/10 transition-colors">
                {n}
              </button>
            ))}
            <div />
            <button onClick={() => handlePinInput('0')} className="bg-[#111820] py-4 rounded-xl text-xl text-white font-medium hover:bg-white/5 active:bg-white/10 transition-colors">0</button>
            <button onClick={handlePinDelete} className="bg-[#111820] py-4 rounded-xl text-sm text-[#4A6075] hover:bg-white/5 active:bg-white/10 transition-colors">⌫</button>
          </div>
          <div className="flex justify-center gap-1.5 mt-8 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" /><div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" /><div className="w-3.5 h-1.5 rounded-full bg-[#0D7377]" />
          </div>
        </motion.div>
      )}

      {step === 'BIOMETRICS' && (
        <motion.div key="biometrics" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-8 relative">
            <Fingerprint className="w-10 h-10 text-blue-400" />
            <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping opacity-20" />
          </div>
          <h1 className="text-2xl font-medium text-white mb-3">Secure your Node.</h1>
          <p className="text-sm text-foreground/50 max-w-[240px] leading-relaxed">
            Enable biometric security to unlock your clinical records with a touch.
          </p>

          <div className="w-full mt-12 space-y-4">
            <button
              onClick={handleBiometricEnroll}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors"
            >
              {isProcessing ? 'Enrolling...' : 'Enroll Biometrics'}
            </button>
            <button
              onClick={handleBiometricSkip}
              className="w-full py-4 rounded-2xl bg-white/5 text-white/40 font-medium text-sm hover:bg-white/10 transition-colors"
            >
              Skip for now
            </button>
          </div>
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
