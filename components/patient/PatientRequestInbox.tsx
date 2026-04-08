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
                  className="zero-border-row group py-8"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-white/80">
                          {req.doctorName[0]}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white tracking-tight leading-none">{req.doctorName}</h4>
                        <p className="text-[10px] font-black text-[#5B8DEF] uppercase tracking-[0.2em]">{req.doctorSpecialty}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void respondToAccessRequest(req.id, false)}
                        className="px-6 py-2 rounded-xl bg-white/5 text-[10px] font-black text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all uppercase tracking-widest"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => setMinimizingReq(req)}
                        className="px-8 py-2 rounded-xl bg-white text-black text-[10px] font-black hover:bg-white/90 transition-all uppercase tracking-widest"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-20 border-t border-white/5 flex flex-col items-center justify-center text-center opacity-30">
           <Shield className="w-8 h-8 mb-4 stroke-1" />
           <p className="text-sm font-bold tracking-tight">Access Inbox Clear</p>
           <p className="text-[9px] text-white/40 mt-1 uppercase tracking-widest">Awaiting synchronization</p>
           
           <button 
             onClick={() => {
                if (firebaseUid) {
                  const pHealthId = (patient?.healthId || healthId)?.trim().toUpperCase()
                  loadAccessRequests(firebaseUid, false, pHealthId || undefined)
                }
             }}
             className="mt-6 px-4 py-2 rounded-xl bg-white/5 text-[9px] font-bold text-white/40 hover:bg-white/10 transition-all uppercase tracking-widest"
           >
             Force Sync
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
