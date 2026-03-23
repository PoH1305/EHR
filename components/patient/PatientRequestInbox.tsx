'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Check, X, Loader2, Shield } from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/GlassCard'

export function PatientRequestInbox() {
  const { accessRequests, loadAccessRequests, respondToAccessRequest, isLoading } = useConsentStore()
  const { healthId } = useUserStore()

  useEffect(() => {
    if (healthId) {
      void loadAccessRequests(healthId, false)
    }
  }, [healthId, loadAccessRequests])

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING')

  if (pendingRequests.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
         <UserPlus className="w-4 h-4 text-blue-400" />
         <h3 className="text-sm font-semibold text-foreground/40 uppercase tracking-widest text-[10px]">Connection Requests</h3>
         <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
           {pendingRequests.length}
         </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {pendingRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{req.doctorName}</h4>
                      <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{req.organization}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void respondToAccessRequest(req.id, false)}
                      className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 hover:bg-red-500/20 transition-all text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => void respondToAccessRequest(req.id, true)}
                      className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30 hover:bg-green-500/30 transition-all text-green-500 shadow-lg shadow-green-500/10"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Access: Clinical Vitals & Summary</span>
                   <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Requested: {new Date(req.requestedAt).toLocaleDateString()}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
