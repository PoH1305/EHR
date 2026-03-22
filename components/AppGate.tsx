'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { X, Delete, LogOut, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { sha256 } from '@/lib/crypto'
import { cn } from '@/lib/utils'

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sessionState, setSessionState, checkBackgroundLock, updateLastActive, patient, signOut } = useUserStore()
  const [isVerifying, setIsVerifying] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Wait for Zustand to hydrate so we don't flash the wrong state
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Check if current route is an auth route
  const isAuthRoute = pathname.startsWith('/auth')

  useEffect(() => {
    if (!hydrated) return
    if (isAuthRoute) return

    // Use profile from store hook
    if (sessionState === 'UNAUTHENTICATED') {
      if (patient) {
        setSessionState('LOCKED')
      } else {
        router.replace('/auth')
      }
      return
    }

    // Redirect to onboarding if patient profile is missing
    const { role } = useUserStore.getState()
    if (sessionState === 'AUTHENTICATED' && role === 'patient' && !patient && pathname !== '/onboarding') {
      router.replace('/onboarding')
      return
    }

    checkBackgroundLock()
  }, [hydrated, isAuthRoute, pathname, router, sessionState, checkBackgroundLock, setSessionState, updateLastActive])


  const handlePinInput = async (num: string) => {
    if (pinInput.length >= 4) return
    setError(null)
    const newPin = pinInput + num
    setPinInput(newPin)

    if (newPin.length === 4) {
      if (!patient?.pinHash) {
        setError('No PIN configured. Please sign out and re-login.')
        return
      }
      
      setIsVerifying(true)
      const hash = await sha256(newPin)
      setIsVerifying(false)
      
      if (hash === patient.pinHash) {
        setSessionState('AUTHENTICATED')
        updateLastActive()
        setPinInput('')
      } else {
        setError('Incorrect PIN')
        setPinInput('')
      }
    }
  }

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1))
    setError(null)
  }

  useEffect(() => {
    const handleActivity = () => {
      if (useUserStore.getState().sessionState === 'AUTHENTICATED') {
        updateLastActive()
      }
    }

    window.addEventListener('click', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)

    return () => {
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [sessionState, pathname, isAuthRoute, router, checkBackgroundLock, setSessionState, updateLastActive, hydrated, isVerifying])

  if (!hydrated) return null

  if (isAuthRoute) {
    return <>{children}</>
  }

  if (sessionState === 'UNAUTHENTICATED' || sessionState === 'LOCKED') {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#080D16] flex flex-col items-center justify-center text-white p-6"
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0D7377] to-[#14A69C] flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-xl tracking-tighter">EHI</span>
            </div>
            <h1 className="text-xl font-bold text-[#E2EAF0]">Session Locked</h1>
            <p className="text-[10px] text-[#4A6075] uppercase tracking-[0.2em] mt-2">Personal Security Vault</p>
          </div>

          <div className="w-full max-w-xs space-y-12">
            {/* PIN Indicator */}
            <div className="flex flex-col items-center gap-6">
              <div className="flex justify-center gap-5">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      i < pinInput.length ? "bg-[#0D7377] scale-110 shadow-[0_0_10px_rgba(13,115,119,0.5)]" : "bg-white/10"
                    )} 
                  />
                ))}
              </div>
              {error && (
                <p className="text-[10px] text-red-400 font-medium px-4 py-1.5 rounded-full bg-red-400/5 border border-red-400/10 animate-shake">
                  {error}
                </p>
              )}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button 
                  key={n} 
                  onClick={() => handlePinInput(n.toString())}
                  className="h-14 rounded-2xl bg-white/[0.03] border border-white/5 text-xl font-medium hover:bg-white/[0.08] active:scale-95 transition-all"
                >
                  {n}
                </button>
              ))}
              <div className="flex items-center justify-center">
                {/* Biometric option removed */}
              </div>
              <button 
                onClick={() => handlePinInput('0')}
                className="h-14 rounded-2xl bg-white/[0.03] border border-white/5 text-xl font-medium hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                0
              </button>
              <button 
                onClick={handlePinDelete}
                className="h-14 rounded-2xl flex items-center justify-center text-[#4A6075] hover:text-[#E2EAF0] active:scale-95 transition-all"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={() => {
                  signOut()
                  router.replace('/auth')
                }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-[10px] font-bold text-[#4A6075] uppercase tracking-widest hover:text-[#E2EAF0] transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Switch Account
              </button>
            </div>
          </div>

          {/* Loading Overlay */}
          {isVerifying && (
            <div className="absolute inset-0 bg-[#080D16]/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#0D7377]" />
                <p className="text-xs text-[#E2EAF0]">Verifying...</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  return <>{children}</>
}
