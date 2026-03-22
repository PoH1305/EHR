'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, ShieldAlert, Loader2, ShieldCheck, Lock, LogOut } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { isBiometricAvailable, verifyBiometric } from '@/lib/crypto'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function AppLockScreen() {
  const router = useRouter()
  const { sessionState, setSessionState, recordFailedAttempt, failedAttempts, resetFailedAttempts, updateLastActive, signOut } = useUserStore()
  const [mounted, setMounted] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    setMounted(true)
    isBiometricAvailable().then(setIsAvailable)
  }, [])

  const handleVerify = async () => {
    setStatus('scanning')
    setShake(false)

    try {
      // Dev mode bypass or if no biometrics found
      if (process.env.NODE_ENV === 'development' || !isAvailable) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        setStatus('success')
        resetFailedAttempts()
        updateLastActive()
        setTimeout(() => setSessionState('AUTHENTICATED'), 400)
        return
      }

      const credentialId = localStorage.getItem('ehi:biometric:credentialId')
      if (!credentialId) {
        throw new Error('No credential')
      }

      const verified = await verifyBiometric(credentialId)
      if (verified) {
        setStatus('success')
        resetFailedAttempts()
        updateLastActive()
        setTimeout(() => setSessionState('AUTHENTICATED'), 400)
      } else {
        throw new Error('Verification failed')
      }
    } catch (err) {
      console.error('Lock verification failed:', err)
      setStatus('error')
      setShake(true)
      recordFailedAttempt()
      setTimeout(() => setShake(false), 500)
    }
  }

  const handleSignOut = () => {
    signOut()
    router.replace('/auth')
  }

  // Prevent hydration mismatch
  if (!mounted) return null

  const isLocked = sessionState === 'UNAUTHENTICATED' || sessionState === 'LOCKED'
  const isSuspended = sessionState === 'SUSPENDED'

  if (!isLocked && !isSuspended) return null

  return (
    <div className="fixed inset-0 z-[99999] bg-[#080D16] flex flex-col items-center justify-center p-6 text-center antialiased">
        <AnimatePresence mode="wait">
          <motion.div
            key={isSuspended ? 'suspended' : 'locked'}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center w-full max-w-xs"
          >
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-[#1A3A8F] flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20">
              <span className="text-white font-bold text-2xl tracking-tighter">EHI</span>
            </div>
            
            <div className="mb-10 text-center">
              <h1 className="text-2xl font-bold text-white mb-2">
                {isSuspended ? 'Access Suspended' : (sessionState === 'LOCKED' ? 'Session Locked' : 'Verification Required')}
              </h1>
              <p className="text-[#4A6075] text-sm">
                {isSuspended ? 'Too many failed attempts.' : 'Please verify your identity to continue.'}
              </p>
            </div>

            {!isSuspended && (
              <motion.div
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center w-full gap-6"
              >
                <button
                  onClick={handleVerify}
                  disabled={status === 'scanning'}
                  className={cn(
                    'group relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500',
                    status === 'idle' && 'bg-[#1A3A8F]/10 hover:bg-[#1A3A8F]/20',
                    status === 'scanning' && 'bg-[#1A3A8F]/20 animate-pulse',
                    status === 'success' && 'bg-green-500/20',
                    status === 'error' && 'bg-red-500/20',
                  )}
                >
                  <div className="relative z-10">
                    {status === 'scanning' ? (
                      <Loader2 className="w-10 h-10 text-[#5B8DEF] animate-spin" />
                    ) : status === 'success' ? (
                      <ShieldCheck className="w-10 h-10 text-green-500" />
                    ) : status === 'error' ? (
                      <ShieldAlert className="w-10 h-10 text-red-500" />
                    ) : (
                      <Fingerprint className="w-10 h-10 text-[#5B8DEF]" />
                    )}
                  </div>
                  {status === 'idle' && (
                    <div className="absolute inset-0 rounded-full border-2 border-[#1A3A8F]/30 animate-ping opacity-20" />
                  )}
                </button>

                <button
                  onClick={handleVerify}
                  disabled={status === 'scanning'}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  <Lock className="w-4 h-4 text-white/40" />
                  {isAvailable ? 'Unlock with Biometrics' : 'Continue to Dashboard'}
                </button>
                
                {failedAttempts > 0 && (
                  <p className="text-xs text-red-500 font-bold uppercase tracking-widest">
                    {3 - failedAttempts} attempts left
                  </p>
                )}
              </motion.div>
            )}

            <button
              onClick={handleSignOut}
              className="mt-12 flex items-center gap-2 text-[#4A6075] hover:text-white transition-colors text-xs py-2 px-4 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out & End Session
            </button>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-10 flex items-center gap-2 text-[10px] text-white/10 tracking-widest uppercase font-bold">
          <ShieldCheck className="w-3 h-3" />
          Secure EHI Clinical Node
        </div>
    </div>
  )
}
