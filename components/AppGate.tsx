'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { auth, isFirebaseInitialized } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Loader2, RefreshCcw } from 'lucide-react'

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const { sessionState, setSessionState, updateLastActive, patient, _hasHydrated, role, setFirebaseUser } = useUserStore()

  const isAuthRoute = pathname.startsWith('/auth')

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseInitialized || !auth) {
      setIsAuthChecking(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user.uid, user.email)
        setSessionState('AUTHENTICATED')
      } else {
        setFirebaseUser(null, null)
        setSessionState('UNAUTHENTICATED')
      }
      setIsAuthChecking(false)
    })

    return () => unsubscribe()
  }, [setFirebaseUser, setSessionState])

  useEffect(() => {
    if (!_hasHydrated || isAuthChecking) return
    if (isAuthRoute) return

    // 1. Not authenticated → redirect to auth
    if (sessionState === 'UNAUTHENTICATED') {
      router.replace('/auth')
      return
    }

    // 2. New patient → onboarding
    if (role === 'patient' && !patient && pathname !== '/onboarding') {
      router.replace('/onboarding')
      return
    }

    // 3. Already onboarded → skip onboarding
    if (pathname === '/onboarding' && patient) {
      router.replace('/dashboard')
      return
    }
  }, [_hasHydrated, isAuthChecking, isAuthRoute, pathname, router, sessionState, patient, role, setSessionState, updateLastActive])

  // Activity tracking
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
  }, [updateLastActive])

  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    if (!_hasHydrated || isAuthChecking) {
      const timer = setTimeout(() => {
        setHasTimedOut(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [_hasHydrated, isAuthChecking])

  if (hasTimedOut && (!_hasHydrated || isAuthChecking)) {
    return (
      <div className="fixed inset-0 bg-[#080D16] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">System Sync Timeout</h2>
        <p className="text-sm text-white/40 max-w-xs mb-8 leading-relaxed">
          The identity synchronization is taking longer than expected. This can happen in private browsing or on restricted networks.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Reload Interface</span>
        </button>
      </div>
    )
  }

  if (!_hasHydrated || isAuthChecking) {
    return (
      <div className="fixed inset-0 bg-[#080D16] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0D7377] animate-spin" />
      </div>
    )
  }

  if (isAuthRoute) {
    return <>{children}</>
  }

  if (sessionState !== 'AUTHENTICATED') {
    return null // Will be redirected by useEffect
  }

  return <>{children}</>
}
