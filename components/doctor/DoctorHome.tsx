'use client'

import React, { useState, useEffect } from 'react'
import { Plus, UserCheck, Clock, XCircle as XCircleIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { useAgentStore } from '@/store/useAgentStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'

export default function DoctorHome() {
  const { priorityQueue } = useAgentStore()
  const { firebaseEmail, firebaseUid, setIsAddPatientOpen, doctor, fetchDoctorProfile } = useUserStore()
  const { accessRequests, loadAccessRequests, cancelAccessRequest } = useConsentStore()
  const [stats, setStats] = useState({
    todayPatients: 12,
    pendingReview: 3
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!firebaseUid) return
    
    db.patient_profiles.count().then(count => {
       setStats(s => ({ ...s, todayPatients: count }))
       setIsLoading(false)
    })

    loadAccessRequests(firebaseUid, true)
    
    if (!doctor) {
      void fetchDoctorProfile(firebaseUid)
    }
  }, [firebaseUid, doctor])

  useEffect(() => {
    setStats(s => ({
      ...s,
      pendingReview: accessRequests.filter(r => r.status === 'PENDING').length
    }))
  }, [accessRequests])

  if (isLoading) {
    return (
      <div className="premium-minimalist-content space-y-12 animate-in fade-in duration-700">
        <div className="flex gap-12">
          {[1, 2].map(i => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24 bg-white/[0.03]" />
              <Skeleton className="h-10 w-16 bg-white/[0.03]" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
           <Skeleton className="h-24 rounded-2xl bg-white/[0.03]" />
           <Skeleton className="h-24 rounded-2xl bg-white/[0.03]" />
        </div>
      </div>
    )
  }

  return (
    <div className="minimalist-grain min-h-[calc(100vh-80px)]">
      <div className="premium-minimalist-content space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header Section */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
             <h1 className="font-plus-jakarta text-4xl font-extrabold text-white tracking-tight">
               {doctor?.name?.split(' ')[1] || doctor?.name || firebaseEmail?.split('@')[0] || 'Practitioner'}
             </h1>
             <p className="text-sm text-white/40 font-medium tracking-wide">
               Clinical Practitioner · Ref: {firebaseUid?.slice(0, 8).toUpperCase()}
             </p>
          </div>
          <button 
            onClick={() => setIsAddPatientOpen(true)}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-all cursor-pointer shadow-2xl"
          >
             <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex gap-16 border-t border-white/5 pt-12">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Patients Today</span>
            <span className="font-plus-jakarta text-3xl font-extrabold text-white">{stats.todayPatients}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Pending Review</span>
            <span className="font-plus-jakarta text-3xl font-extrabold text-[#5B8DEF]">{stats.pendingReview}</span>
          </div>
        </div>

        {/* Activity Ledger */}
        <div className="space-y-8">
          <span className="text-[11px] font-bold text-white/10 uppercase tracking-[0.3em] block">Access Ledger</span>
          
          <div className="divide-y divide-white/5">
            {accessRequests.length > 0 ? (
              accessRequests.slice(0, 8).map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="zero-border-row group"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      req.status === 'APPROVED' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
                      req.status === 'DENIED' ? "bg-red-500" :
                      "bg-amber-500"
                    )} />
                    <div>
                      <p className="text-base font-semibold text-white group-hover:text-white/80 transition-colors">
                        {req.patientName || req.patientId}
                      </p>
                      <p className="text-[10px] text-white/20 font-medium uppercase tracking-wider mt-0.5">
                         Synced · {req.status === 'APPROVED' ? 'Active Trust' : req.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        {req.status}
                      </p>
                    </div>

                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => cancelAccessRequest(req.id)}
                        className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all group/cancel"
                        title="Cancel Request"
                      >
                        <XCircleIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                 <Clock className="w-8 h-8 mb-4 stroke-1" />
                 <p className="text-sm font-bold tracking-tight">Empty Ledger</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
