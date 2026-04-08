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

  // Synchronized via DashboardPage to ensure real-time visibility

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
                      <div className="w-12 h-12 rounded-full bg-foreground/[0.03] border border-foreground/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-foreground/40">
                          {req.doctorName[0]}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-foreground tracking-tight leading-none">{req.doctorName}</h4>
                        <p className="text-[10px] font-black text-[#5B8DEF] uppercase tracking-[0.2em]">{req.doctorSpecialty}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void respondToAccessRequest(req.id, false)}
                        className="px-6 py-2 rounded-xl bg-foreground/[0.03] text-[10px] font-black text-foreground/40 hover:bg-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => setMinimizingReq(req)}
                        className="px-8 py-2 rounded-xl bg-foreground text-background text-[10px] font-black hover:opacity-90 transition-all uppercase tracking-widest"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      ) : null}

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
