'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, ShieldAlert } from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'

export default function RequestNotification() {
  const { accessRequests, respondToAccessRequest } = useConsentStore()
  const [pendingReq, setPendingReq] = useState(accessRequests.find(r => r.status === 'PENDING') || null)


  useEffect(() => {
    // Look for the most recent pending request
    const p = accessRequests.find(r => r.status === 'PENDING')
    setPendingReq(p || null)
  }, [accessRequests])

  if (!pendingReq) return null

  return (
    <AnimatePresence>
      {pendingReq && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-24 left-4 right-4 z-[50] sm:left-auto sm:right-6 sm:w-96"
        >
          <div className="glass-card overflow-hidden border border-primary/20 shadow-2xl shadow-primary/10">
            <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">New Access Request</span>
              </div>
              <button 
                onClick={() => respondToAccessRequest(pendingReq.id, false)}
                className="p-1 rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-foreground/40" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-foreground/5 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-primary/40" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {pendingReq.doctorName}
                  </p>
                  <p className="text-[11px] text-foreground/40 leading-relaxed">
                    {pendingReq.organization} is requesting secure access to your clinical records.
                  </p>
                </div>
              </div>



              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => respondToAccessRequest(pendingReq.id, false)}
                  className="py-3 rounded-xl bg-foreground/5 text-foreground/60 text-[10px] font-bold uppercase tracking-widest hover:bg-foreground/10 transition-all border border-foreground/5"
                >
                  Decline
                </button>
                <button
                  onClick={() => respondToAccessRequest(pendingReq.id, true)}
                  className="py-3 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
                >
                  Approve Access
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
