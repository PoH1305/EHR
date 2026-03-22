'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { verifyDevice } from '@/lib/webauthn'

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sessionState, setSessionState, checkBackgroundLock, updateLastActive } = useUserStore()
  const [isVerifying, setIsVerifying] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Wait for Zustand to hydrate so we don't flash the wrong state
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Check if current route is an auth route
  const isAuthRoute = pathname.startsWith('/auth')

  useEffect(() => {
    if (!hydrated) return
    if (isAuthRoute) return

    if (sessionState === 'UNAUTHENTICATED') {
      router.replace('/auth')
      return
    }

    // Redirect to onboarding if patient profile is missing
    const { patient, role } = useUserStore.getState()
    if (sessionState === 'AUTHENTICATED' && role === 'patient' && !patient && pathname !== '/onboarding') {
      router.replace('/onboarding')
      return
    }

    checkBackgroundLock()

    const verify = async () => {
      if (useUserStore.getState().sessionState === 'LOCKED' && !isVerifying) {
        setIsVerifying(true)
        const success = await verifyDevice()
        setIsVerifying(false)
        if (success) {
          setSessionState('AUTHENTICATED')
          updateLastActive()
        } else {
          router.replace('/auth/locked')
        }
      }
    }

    void verify()

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

  // Show blocking overlay if locked or verifying
  if (sessionState === 'UNAUTHENTICATED' || sessionState === 'LOCKED') {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#080D16] flex flex-col items-center justify-center text-white"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-2xl tracking-tighter">EHI</span>
          </div>
          {isVerifying ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D7377]" />
              <p className="text-sm font-medium text-[#E2EAF0]">Verifying Biometrics...</p>
              <p className="text-[10px] text-[#4A6075]">Waiting for device confirmation</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <ShieldCheck className="w-8 h-8 text-[#4A6075]" />
              <p className="text-xs text-[#4A6075]">Securing session...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  return <>{children}</>
}
