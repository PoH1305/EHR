'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { auth, isFirebaseInitialized } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Loader2, RefreshCcw } from 'lucide-react'

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [hasTimedOut, setHasTimedOut] = useState(false)

  const { 
    sessionState, 
    setSessionState, 
    updateLastActive, 
    patient, 
    _hasHydrated, 
    role, 
    setFirebaseUser,
    firebaseUid,
    fetchProfileFromCloud
  } = useUserStore()

  const isAuthRoute = useMemo(() => pathname.startsWith('/auth'), [pathname])

  // 1. Initial Mount & Activity Listeners
  useEffect(() => {
    setMounted(true)
    
    const handleActivity = () => {
      if (useUserStore.getState().sessionState === 'AUTHENTICATED') {
        updateLastActive()
      }
    }

    const events = ['click', 'keydown', 'touchstart']
    events.forEach(e => window.addEventListener(e, handleActivity))
    return () => events.forEach(e => window.removeEventListener(e, handleActivity))
  }, [updateLastActive])

  // 2. Firebase Auth Listener
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

  // 3. Timeout Safety
  useEffect(() => {
    if (!_hasHydrated || isAuthChecking) {
      const timer = setTimeout(() => setHasTimedOut(true), 10000) // 10s grace
      return () => clearTimeout(timer)
    }
  }, [_hasHydrated, isAuthChecking])

  // 4. Cloud Recovery & Routing
  useEffect(() => {
    if (!mounted || !_hasHydrated || isAuthChecking) return

    // Cloud recovery if profile lost but auth exists
    if (firebaseUid && !patient) {
      console.log('[AppGate] Profile recovery check (UID: ' + firebaseUid + ')...')
      fetchProfileFromCloud()
    }

    if (isAuthRoute) return

    // Navigation logic
    if (sessionState === 'UNAUTHENTICATED') {
      router.replace('/auth')
    } else if (!patient && pathname !== '/onboarding' && role !== 'doctor') {
      // If no profile and not a doctor, always go to onboarding to re-link or create
      router.replace('/onboarding')
    } else if (pathname === '/onboarding' && patient) {
      router.replace('/dashboard')
    }
  }, [mounted, _hasHydrated, isAuthChecking, firebaseUid, patient, role, sessionState, isAuthRoute, pathname, router, fetchProfileFromCloud])

  // Render Logic
  if (!mounted) return null

  if (hasTimedOut && (!_hasHydrated || isAuthChecking)) {
    return (
      <div className="fixed inset-0 bg-[#080D16] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">System Sync Timeout</h2>
        <p className="text-sm text-white/40 max-w-xs mb-8 leading-relaxed">
          Initialization is taking longer than expected. Please check your connection or try reloading.
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

  if (isAuthRoute) return <>{children}</>
  
  if (sessionState !== 'AUTHENTICATED') return null

  return <>{children}</>
}
