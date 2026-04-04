'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
// Remove Firebase imports and replace with Supabase
import { supabase } from '@/lib/supabase'
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
    fetchProfileFromCloud,
    syncProfileToCloud,
    doctor,
    isProfileRestoring
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

  // 2. Supabase Auth Listener
  useEffect(() => {
    if (!supabase) {
      setIsAuthChecking(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setFirebaseUser(session.user.id, session.user.email || null)
        setSessionState('AUTHENTICATED')
      } else {
        setFirebaseUser(null, null)
        setSessionState('UNAUTHENTICATED')
      }
      setIsAuthChecking(false)
    })

    // Also check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setFirebaseUser(session.user.id, session.user.email || null)
        setSessionState('AUTHENTICATED')
      } else {
        setFirebaseUser(null, null)
        setSessionState('UNAUTHENTICATED')
      }
      setIsAuthChecking(false)
    })

    return () => subscription.unsubscribe()
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
    const { isProfileRestoring } = useUserStore.getState()
    if (firebaseUid && !patient && !isProfileRestoring) {
      console.log('[AppGate] Profile recovery check (UID: ' + firebaseUid + ')...')
      fetchProfileFromCloud()
    }

    // Ensure profile is synced to Supabase (critical for RLS health_id lookups)
    if (firebaseUid && (patient || doctor)) {
      syncProfileToCloud()
    }

    // Note: Recovery sync is now handled by Dashboard.tsx after loadClinicalData
    // which ensures we don't overwrite cloud data with an empty local state.

    if (isAuthRoute) return

    // Navigation logic
    if (sessionState === 'UNAUTHENTICATED') {
      router.replace('/auth')
    } else if (role === 'doctor') {
      // Doctors always go to dashboard (which matches the doctor UI in AppShell)
      if (pathname === '/onboarding') router.replace('/dashboard')
    } else if (!patient && pathname !== '/onboarding') {
      // Patients without profile go to onboarding
      router.replace('/onboarding')
    } else if (pathname === '/onboarding' && patient) {
      router.replace('/dashboard')
    }
  }, [mounted, _hasHydrated, isAuthChecking, firebaseUid, patient, doctor, role, sessionState, isAuthRoute, pathname, router, fetchProfileFromCloud, syncProfileToCloud])

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

  if (!_hasHydrated || isAuthChecking || isProfileRestoring) {
    return (
      <div className="fixed inset-0 bg-[#080D16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#0D7377] animate-spin" />
          {isProfileRestoring && (
            <p className="text-[10px] text-[#4A6075] uppercase tracking-[0.2em] animate-pulse">
              Restoring Clinical Identity...
            </p>
          )}
        </div>
      </div>
    )
  }

  if (isAuthRoute) return <>{children}</>
  
  if (sessionState !== 'AUTHENTICATED') return null

  return <>{children}</>
}
