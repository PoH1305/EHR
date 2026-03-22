'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft, History } from 'lucide-react'

interface ConsentExpiredOverlayProps {
  onReturn: () => void
  type?: 'EMERGENCY' | 'STANDARD'
}

export function ConsentExpiredOverlay({ onReturn, type = 'EMERGENCY' }: ConsentExpiredOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0a0a0a]/90 backdrop-blur-xl"
    >
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-2xl shadow-red-500/10">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Access Expired</h1>
        <p className="text-sm text-slate-400 mb-10 leading-relaxed">
          The emergency session has ended. This access event has been fully logged and the patient has been notified.
          All clinical records are now re-encrypted.
        </p>

        <div className="space-y-4">
          <button 
            onClick={onReturn}
            className="w-full py-4 rounded-3xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </button>
          
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 text-left">
            <History className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Audit ID</p>
              <p className="text-[11px] font-mono text-slate-400">SESSION_LOGGED_BH72-XC91</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
