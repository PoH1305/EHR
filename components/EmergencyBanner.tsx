'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, XCircle } from 'lucide-react'

interface EmergencyBannerProps {
  active: boolean
  expiresAt: string
  onDeactivate: () => void
}

export function EmergencyBanner({ active, expiresAt, onDeactivate }: EmergencyBannerProps) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!active) return

    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      const h = Math.floor(remaining / 3600).toString().padStart(2, '0')
      const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0')
      const s = (remaining % 60).toString().padStart(2, '0')
      setCountdown(`${h}:${m}:${s}`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [active, expiresAt])

  if (!active) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-red-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg shadow-red-500/20">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-medium">
          ⚠ Emergency Access Active — All access is being logged — Expires in{' '}
          <span className="font-mono font-bold">{countdown}</span>
        </span>
      </div>
      <button
        onClick={onDeactivate}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
      >
        <XCircle className="w-3.5 h-3.5" />
        Deactivate
      </button>
    </div>
  )
}
