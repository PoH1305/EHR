'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sessionState, setSessionState, updateLastActive, patient, _hasHydrated, role } = useUserStore()

  const isAuthRoute = pathname.startsWith('/auth')

  useEffect(() => {
    if (!_hasHydrated) return
    if (isAuthRoute) return

    // 1. Not authenticated → redirect to auth
    if (sessionState !== 'AUTHENTICATED') {
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
  }, [_hasHydrated, isAuthRoute, pathname, router, sessionState, patient, role, setSessionState, updateLastActive])

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

  if (!_hasHydrated) return null

  if (isAuthRoute) {
    return <>{children}</>
  }

  if (sessionState !== 'AUTHENTICATED') {
    return null // Will be redirected by useEffect
  }

  return <>{children}</>
}
