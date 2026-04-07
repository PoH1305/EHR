'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Check, X, Loader2, Shield, Plus } from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/GlassCard'
import { DataMinimizationView } from './DataMinimizationView'
import type { AccessRequest } from '@/lib/types'

export function PatientRequestInbox() {
  const { accessRequests, loadAccessRequests, respondToAccessRequest, isLoading } = useConsentStore()
  const { healthId, patient, firebaseUid } = useUserStore()
  const [selectedCats, setSelectedCats] = React.useState<Record<string, string[]>>({})
  const [minimizingReq, setMinimizingReq] = React.useState<AccessRequest | null>(null)

  useEffect(() => {
    // UNIFIED IDENTITY: Use Auth UID as primary (matches what doctors save),
    // with Health ID as altId for legacy/dual-identity support
    const pHealthId = (patient?.healthId || healthId)?.trim().toUpperCase()
    if (firebaseUid) {
      console.log(`[PatientRequestInbox] Fetching requests for uid: ${firebaseUid}, altId: ${pHealthId}`)
      loadAccessRequests(firebaseUid, false, pHealthId || undefined)
    }
  }, [firebaseUid, healthId, patient?.healthId, loadAccessRequests])

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
  console.log(`[ConsentStore] Loaded ${accessRequests.length} incoming requests for patient: ${firebaseUid}`)
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
                  <GlassCard className="p-5 border border-white/5 overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        {/* Avatar with Initials */}
                        <div className="w-12 h-12 rounded-full bg-[#E3F2ED] flex items-center justify-center shrink-0 border border-emerald-500/10">
                          <span className="text-sm font-bold text-[#2D6A4F]">
                            {req.doctorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-bold text-white tracking-tight">{req.doctorName}</h4>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
                            <Plus className="w-2.5 h-2.5 text-blue-400" />
                            <span className="text-[10px] font-bold text-blue-400 tracking-tight">{req.doctorSpecialty}</span>
                          </div>
                        </div>
                      </div>

                      {/* Organization Center-Right */}
                      <div className="hidden lg:block flex-1 text-center">
                        <p className="text-[11px] text-white/40 font-medium tracking-wide">{req.organization}</p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => void respondToAccessRequest(req.id, false)}
                          className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                        >
                          Deny
                        </button>
                        <button
                          onClick={() => setMinimizingReq(req)}
                          className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all font-medium"
                        >
                          Configure & share
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
           <p className="text-[9px] text-white/10 mt-1 uppercase tracking-widest mb-4">Sync active for {firebaseUid || patient?.healthId || healthId}</p>
           
           <button 
             onClick={() => {
                if (firebaseUid) {
                  const pHealthId = (patient?.healthId || healthId)?.trim().toUpperCase()
                  loadAccessRequests(firebaseUid, false, pHealthId || undefined)
                }
             }}
             className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 hover:bg-white/10 transition-all uppercase tracking-widest"
           >
             Force Sync Identity
           </button>
        </div>
      )}

      <AnimatePresence>
        {minimizingReq && (
          <DataMinimizationView 
            request={minimizingReq}
            onClose={() => setMinimizingReq(null)}
            onConfirm={(cats) => {
              void respondToAccessRequest(minimizingReq.id, true, cats)
              setMinimizingReq(null)
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
