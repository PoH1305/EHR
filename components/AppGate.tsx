'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { auth, isFirebaseInitialized } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Loader2 } from 'lucide-react'

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
