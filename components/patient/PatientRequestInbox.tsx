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
  const { healthId, patient } = useUserStore()
  const [selectedCats, setSelectedCats] = React.useState<Record<string, string[]>>({})

  useEffect(() => {
    const effectiveId = patient?.healthId || healthId
    if (effectiveId) {
      console.log(`[PatientRequestInbox] Fetching requests for healthId: ${effectiveId}`)
      loadAccessRequests(effectiveId, false)
    }
  }, [healthId, patient?.healthId, loadAccessRequests])

  const categories = [
    { id: 'vitals', label: 'Vitals' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'medications', label: 'Medications' },
    { id: 'allergies', label: 'Allergies' },
    { id: 'clinicalNotes', label: 'Notes' },
    { id: 'medicalImages', label: 'Images' },
    { id: 'attachments', label: 'Reports' }
  ]

  const toggleCategory = (requestId: string, catId: string) => {
    setSelectedCats(prev => {
      const current = prev[requestId] || categories.map(c => c.id)
      const next = current.includes(catId)
        ? current.filter(c => c !== catId)
        : [...current, catId]
      return { ...prev, [requestId]: next }
    })
  }

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING')
  console.log('[PatientRequestInbox] Rendering pendingRequests:', {
    total: accessRequests.length,
    pending: pendingRequests.length,
    raw: accessRequests.map(r => ({ id: r.id, status: r.status }))
  })

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
         <UserPlus className="w-4 h-4 text-blue-400" />
         <h3 className="text-sm font-semibold text-foreground/40 uppercase tracking-widest text-[10px]">Connection Requests</h3>
         {pendingRequests.length > 0 && (
           <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
             {pendingRequests.length}
           </span>
         )}
      </div>

      {pendingRequests.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {pendingRequests.map((req) => {
              const selected = selectedCats[req.id] || categories.map(c => c.id)
              
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GlassCard className="p-4 border-l-4 border-l-blue-500 overflow-hidden">
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
                          onClick={() => void respondToAccessRequest(req.id, true, selected)}
                          className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30 hover:bg-green-500/30 transition-all text-green-500 shadow-lg shadow-green-500/10"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {req.reason && (
                      <div className="mt-4 p-3 rounded-2xl bg-[#0F172A] border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.2em] mb-1.5 relative z-10">Clinical Intent</p>
                        <p className="text-[11px] text-white/80 leading-relaxed font-medium relative z-10 italic">
                          "{req.reason}"
                        </p>
                      </div>
                    )}
                    
                    {/* Category Selection */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                       <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Share categories:</p>
                       <div className="flex flex-wrap gap-2">
                          {categories.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => toggleCategory(req.id, cat.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border",
                                selected.includes(cat.id)
                                  ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                                  : "bg-white/5 border-white/5 text-white/20"
                              )}
                            >
                              {cat.label}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="mt-4 pt-3 flex items-center justify-between opacity-30 italic">
                       <span className="text-[8px] text-white font-bold uppercase tracking-widest leading-none">
                         Requested: {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : 'Recent'}
                       </span>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-8 border-2 border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center px-8 bg-white/[0.01]">
           <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-white/10" />
           </div>
           <p className="text-sm font-bold text-white/20 tracking-tight">No pending requests</p>
           <p className="text-[9px] text-white/10 mt-1 uppercase tracking-widest mb-4">Sync active for {patient?.healthId || healthId}</p>
           
           <button 
             onClick={() => {
                const id = patient?.healthId || healthId
                if (id) loadAccessRequests(id, false)
             }}
             className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 hover:bg-white/10 transition-all uppercase tracking-widest"
           >
             Force Sync Identity
           </button>
        </div>
      )}
    </section>
  )
}
