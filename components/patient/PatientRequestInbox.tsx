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

  const SYSTEM_TO_CAT_MAP: Record<string, string[]> = {
    'Heart': ['vitals', 'medicalImages'],
    'Bones': ['attachments'],
    'Mental': ['clinicalNotes'],
    'Lungs': ['vitals', 'attachments'],
    'Digestive': ['attachments', 'medications'],
    'Blood': ['attachments'],
    'Brain': ['clinicalNotes', 'medicalImages'],
    'Skin': ['attachments'],
    'General': ['vitals', 'conditions', 'medications', 'allergies', 'clinicalNotes', 'attachments']
  }

  // Categories are now managed exclusively via the DataMinimization Wizard

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
            {pendingRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="p-6 rounded-[32px] bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]/20 transition-all group">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                          <span className="text-lg font-black text-white/80">
                            {req.doctorName[0]}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-white tracking-tight leading-none">{req.doctorName}</h4>
                          <p className="text-[10px] font-black text-[#238636] uppercase tracking-[0.2em]">{req.doctorSpecialty}</p>
                          <p className="text-[11px] text-[#8b949e] font-medium">{req.organization}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => void respondToAccessRequest(req.id, false)}
                          className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-black text-[#8b949e] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all uppercase tracking-widest"
                        >
                          Deny
                        </button>
                        <button
                          onClick={() => setMinimizingReq(req)}
                          className="flex-1 sm:flex-none px-8 py-3 rounded-2xl bg-white text-black text-xs font-black hover:bg-white/90 transition-all uppercase tracking-widest shadow-xl shadow-white/5"
                        >
                          Configure Access
                        </button>
                      </div>
                    </div>
                    
                    {req.reason && (
                      <div className="mt-6 p-4 rounded-2xl bg-[#0d1117] border border-[#30363d] relative overflow-hidden group-hover:border-[#8b949e]/10 transition-colors">
                        <p className="text-[9px] font-black text-[#8b949e]/40 uppercase tracking-[0.2em] mb-2">Intent</p>
                        <p className="text-xs text-white/70 leading-relaxed font-medium italic">
                          "{req.reason}"
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
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
            onConfirm={(payload) => {
              // Map Wizard Payload to Store Action
              const derivedCategories = Array.from(new Set(
                payload.systems.flatMap(sys => SYSTEM_TO_CAT_MAP[sys] || [])
              ))
              
              void respondToAccessRequest(
                minimizingReq.id, 
                true, 
                derivedCategories
              )
              setMinimizingReq(null)
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
