'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'

interface EmergencyAccessNotificationProps {
  date: string
  time: string
  onClose?: () => void
}

export function EmergencyAccessNotification({ date, time, onClose }: EmergencyAccessNotificationProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 shadow-xl shadow-amber-500/5"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold text-amber-200">Emergency Access Triggered</p>
          <p className="text-[11px] text-amber-500/80 font-medium">
            Your records were accessed on {date} at {time} via Break-Glass override.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link 
          href="/emergency"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
        >
          View Log
          <ChevronRight className="w-3 h-3" />
        </Link>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4 text-amber-500/50" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
