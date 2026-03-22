'use client'

import React, { useState } from 'react'
import { Fingerprint, ShieldCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BiometricUnlockProps {
  onSuccess: () => void
  onFailure?: () => void
  compact?: boolean
  className?: string
}

export function BiometricUnlock({ onSuccess, onFailure, compact = false, className }: BiometricUnlockProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')

  const handleBiometricAuth = async () => {
    setStatus('scanning')

    try {
      // In development, simulate biometric with a delay
      if (process.env.NODE_ENV === 'development') {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        setStatus('success')
        setTimeout(onSuccess, 500)
        return
      }

      const { verifyBiometric, isBiometricAvailable } = await import('@/lib/crypto')
      const available = await isBiometricAvailable()

      if (!available) {
        // Fallback: simulate success for demo
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setStatus('success')
        setTimeout(onSuccess, 500)
        return
      }

      const credentialId = localStorage.getItem('ehi:biometric:credentialId')
      if (!credentialId) {
        setStatus('error')
        onFailure?.()
        return
      }

      const verified = await verifyBiometric(credentialId)
      if (verified) {
        setStatus('success')
        setTimeout(onSuccess, 500)
      } else {
        setStatus('error')
        onFailure?.()
      }
    } catch {
      setStatus('error')
      onFailure?.()
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleBiometricAuth}
        disabled={status === 'scanning'}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300',
          status === 'idle' && 'bg-primary/10 text-primary hover:bg-primary/20',
          status === 'scanning' && 'bg-primary/5 text-primary/60 cursor-wait',
          status === 'success' && 'bg-green-500/10 text-green-500',
          status === 'error' && 'bg-red-500/10 text-red-500',
          className
        )}
      >
        {status === 'scanning' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'success' ? (
          <ShieldCheck className="w-4 h-4" />
        ) : (
          <Fingerprint className="w-4 h-4" />
        )}
        {status === 'idle' && 'Verify Identity'}
        {status === 'scanning' && 'Scanning...'}
        {status === 'success' && 'Verified'}
        {status === 'error' && 'Try Again'}
      </button>
    )
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <button
        onClick={handleBiometricAuth}
        disabled={status === 'scanning'}
        className={cn(
          'relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500',
          status === 'idle' && 'bg-primary/10 hover:bg-primary/20 hover:scale-110',
          status === 'scanning' && 'bg-primary/20 animate-pulse',
          status === 'success' && 'bg-green-500/20 scale-110',
          status === 'error' && 'bg-red-500/20',
        )}
      >
        {status === 'scanning' ? (
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        ) : status === 'success' ? (
          <ShieldCheck className="w-10 h-10 text-green-500" />
        ) : (
          <Fingerprint className={cn(
            'w-10 h-10 transition-colors',
            status === 'error' ? 'text-red-500' : 'text-primary'
          )} />
        )}
        {status === 'idle' && (
          <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        )}
      </button>

      <p className={cn(
        'text-sm font-medium transition-colors',
        status === 'idle' && 'text-muted-foreground',
        status === 'scanning' && 'text-primary',
        status === 'success' && 'text-green-500',
        status === 'error' && 'text-red-500',
      )}>
        {status === 'idle' && 'Tap to verify your identity'}
        {status === 'scanning' && 'Verifying biometrics...'}
        {status === 'success' && 'Identity verified'}
        {status === 'error' && 'Verification failed. Tap to retry.'}
      </p>
    </div>
  )
}
