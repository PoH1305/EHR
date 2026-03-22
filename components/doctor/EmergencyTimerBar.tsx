'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Timer, Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmergencyTimerBarProps {
  expiresAt: string
  onExpire: () => void
  onExtend: () => void
  allowExtension: boolean
}

export function EmergencyTimerBar({ expiresAt, onExpire, onExtend, allowExtension }: EmergencyTimerBarProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [percent, setPercent] = useState(100)
  const [isCritical, setIsCritical] = useState(false)

  useEffect(() => {
    const totalDuration = new Date(expiresAt).getTime() - Date.now()
    
    const update = () => {
      const now = Date.now()
      const expiry = new Date(expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
      
      if (remaining === 0) {
        onExpire()
        return
      }

      const h = Math.floor(remaining / 3600).toString().padStart(2, '0')
      const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0')
      const s = (remaining % 60).toString().padStart(2, '0')
      
      setTimeLeft(`${h}:${m}:${s}`)
      setPercent((remaining * 1000 / totalDuration) * 100)
      setIsCritical(remaining < 300) // 5 minutes
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-colors duration-500",
      isCritical ? "bg-red-600 animate-pulse shadow-[0_4px_20px_rgba(220,38,38,0.4)]" : "bg-red-500/90 backdrop-blur-md shadow-lg"
    )}>
      <div className="max-w-md mx-auto px-6 h-12 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Clock className={cn("w-4 h-4", isCritical ? "animate-spin-slow" : "")} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Emergency Access Active</span>
            <span className="text-sm font-mono font-bold leading-none">{timeLeft} remaining</span>
          </div>
        </div>

        {allowExtension && !isCritical && (
          <button 
            onClick={onExtend}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            Extend
          </button>
        )}
        
        {isCritical && (
          <div className="flex items-center gap-1">
            <Timer className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase animate-pulse">Critical</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-black/20 w-full overflow-hidden">
        <motion.div 
          className="h-full bg-white"
          initial={{ width: '100%' }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}
