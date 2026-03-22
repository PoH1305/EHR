'use client'

import React, { useState } from 'react'
import { ShieldCheck, Loader2, Delete } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import { sha256 } from '@/lib/crypto'

interface PinUnlockProps {
  onSuccess: () => void
  onFailure?: () => void
  className?: string
}

export function PinUnlock({ onSuccess, onFailure, className }: PinUnlockProps) {
  const [pinInput, setPinInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const { patient } = useUserStore()

  const handleInput = async (num: string) => {
    if (pinInput.length >= 4 || status === 'verifying') return
    const newPin = pinInput + num
    setPinInput(newPin)

    if (newPin.length === 4) {
      setStatus('verifying')
      const hash = await sha256(newPin)
      
      if (hash === patient?.pinHash) {
        setStatus('success')
        setTimeout(onSuccess, 500)
      } else {
        setStatus('error')
        setPinInput('')
        setTimeout(() => setStatus('idle'), 1500)
        onFailure?.()
      }
    }
  }

  const handleDelete = () => {
    if (status === 'verifying') return
    setPinInput(prev => prev.slice(0, -1))
  }

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* PIN Dots */}
      <div className="flex justify-center gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              status === 'success' ? "bg-green-500 scale-110" :
              status === 'error' ? "bg-red-500 animate-shake" :
              i < pinInput.length ? "bg-blue-500 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"
            )} 
          />
        ))}
      </div>

      {status === 'verifying' ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Verifying PIN...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button 
              key={n} 
              onClick={() => handleInput(n.toString())}
              className="h-12 rounded-2xl bg-white/[0.03] border border-white/5 text-lg font-medium hover:bg-white/[0.08] active:scale-95 transition-all"
            >
              {n}
            </button>
          ))}
          <div />
          <button 
            onClick={() => handleInput('0')}
            className="h-12 rounded-2xl bg-white/[0.03] border border-white/5 text-lg font-medium hover:bg-white/[0.08] active:scale-95 transition-all"
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            className="h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white active:scale-95 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      )}

      {status === 'error' && (
        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Incorrect PIN</p>
      )}
    </div>
  )
}
