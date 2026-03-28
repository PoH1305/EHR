'use client'

import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { useAgentStore } from '@/store/useAgentStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/store/useToast'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useRouter } from 'next/navigation'
import { ShieldAlert, UserCheck, Clock, XCircle as XCircleIcon } from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'

export default function DoctorHome() {
  const { priorityQueue, runClinicalTriage, isSuspicious, lastAnomaly, checkSecurityPulse } = useAgentStore()
  const { firebaseEmail, firebaseUid, setIsAddPatientOpen, doctor, fetchDoctorProfile } = useUserStore()
  const { accessRequests, loadAccessRequests } = useConsentStore()
  const [isPrivacyMode] = useState(false)
  const router = useRouter()
  const [stats, setStats] = useState({
    todayPatients: 12,
    pendingReview: 3,
    criticalCases: 1
  })
  const [isLoading, setIsLoading] = useState(true)

  // Combined metadata and triage effect
  useEffect(() => {
    if (!firebaseUid) return
    
    // 1. Initial metadata fetch (fast)
    db.patient_profiles.count().then(count => {
       setStats(s => ({ ...s, todayPatients: count }))
       setIsLoading(false)
    })

    // 2. Setup real-time listeners (async, non-blocking)
    loadAccessRequests(firebaseUid, true)
    
    // 4. Load doctor profile
    if (!doctor) {
      void fetchDoctorProfile(firebaseUid)
    }
  }, [firebaseUid, doctor]) // Only re-run when user changes

  // Derived stats from store (reactive)
  useEffect(() => {
    setStats(s => ({
      ...s,
      criticalCases: priorityQueue.length,
      pendingReview: accessRequests.filter(r => r.status === 'PENDING').length
    }))
  }, [priorityQueue.length, accessRequests])

  if (isLoading) {
    return (
      <div className="space-y-12 pb-24 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 rounded-[32px] bg-white/[0.03]" />
          ))}
        </div>
        <div className="space-y-6">
           <Skeleton className="h-4 w-48 bg-white/[0.03] ml-1" />
           <Skeleton className="h-24 rounded-[32px] bg-white/[0.03]" />
        </div>
        <div className="space-y-6">
           <Skeleton className="h-4 w-48 bg-white/[0.03] ml-1" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-48 rounded-[32px] bg-white/[0.03]" />
              ))}
           </div>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      {/* Greeting Section */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-4xl font-black text-white tracking-tight">Good morning.</h1>
           <p className="text-sm text-white/30 font-medium mt-1">{doctor?.name || firebaseEmail?.split('@')[0] || 'Dr. Practitioner'}</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsAddPatientOpen(true)}
             className="w-12 h-12 rounded-2xl bg-[#5B8DEF] border border-white/5 flex items-center justify-center text-white hover:bg-[#5B8DEF]/90 transition-all cursor-pointer shadow-lg shadow-[#5B8DEF]/20"
           >
              <Plus className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "TODAY'S PATIENTS", value: stats.todayPatients, id: 'today' },
          { label: "PENDING REVIEW", value: stats.pendingReview, id: 'pending' },
          { label: "CRITICAL", value: stats.criticalCases, id: 'critical' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#111827]/60 border border-white/[0.05] p-6 rounded-[32px] relative overflow-hidden group hover:bg-[#111827]/80 transition-all shadow-xl shadow-black/20"
          >
             <div className="text-3xl font-black text-white tracking-tighter mb-4">{stat.value}</div>
             <div className="text-[10px] uppercase font-bold text-white/20 tracking-[0.2em]">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Today's Rounds */}
      <div className="space-y-6 pt-4">
        <h2 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/20 ml-1">Today&apos;s Rounds</h2>
        <div className="space-y-3">
           {[
             { time: "09:30", name: "Scheduled Consultation", reason: "Follow-up", status: "PENDING", theme: "bg-[#1A3A8F] text-white" },
             { time: "11:30", name: "Urgent Review", reason: "Recent Clinical Notes", status: "URGENT", theme: "bg-red-600/10 text-red-500 border border-red-500/20" },
           ].map((round, j) => (
              <motion.div
                key={round.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * j }}
                className="bg-[#111827]/30 border border-white/[0.03] p-5 rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-[#111827]/50 transition-all cursor-pointer"
                onClick={() => router.push('/patients')}
              >
                  <div className="flex items-center gap-4 sm:gap-6">
                     <span className="text-sm font-black text-[#5B8DEF] tracking-tight shrink-0">{round.time}</span>
                     <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate" data-privacy="true">{round.name}</p>
                        <p className="text-[10px] text-white/20 font-medium mt-0.5 truncate">{round.reason}</p>
                     </div>
                  </div>
                  <div className="flex justify-end sm:block">
                    <div 
                      data-privacy-mode={isPrivacyMode}
                      className={cn(
                                  "px-4 py-1.5 rounded-full text-[8px] font-black tracking-widest uppercase w-fit whitespace-nowrap",
                                  round.theme
                                )}>
                       {round.status}
                    </div>
                  </div>
              </motion.div>
           ))}
        </div>
      </div>

      {/* Connection Activity */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between px-1">
           <h2 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/20">Connection Activity</h2>
           {accessRequests.length > 0 && (
             <span className="text-[9px] font-black text-[#5B8DEF] uppercase tracking-widest">Real-time Sync Active</span>
           )}
        </div>
        
        {accessRequests.length > 0 ? (
          <div className="space-y-3">
            {accessRequests.slice(0, 5).map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#111827]/30 border border-white/[0.03] p-5 rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-[#111827]/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0",
                    req.status === 'APPROVED' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                    req.status === 'DENIED' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                    "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  )}>
                    {req.status === 'APPROVED' ? <UserCheck className="w-5 h-5" /> : 
                     req.status === 'DENIED' ? <XCircleIcon className="w-5 h-5" /> : 
                     <Clock className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{req.patientName || req.patientId}</p>
                    <p className="text-[10px] text-white/20 font-medium uppercase tracking-wider truncate">
                       {req.status === 'PENDING' ? 'Waiting for approval' : 
                        req.status === 'APPROVED' ? 'Access Granted' : 'Access Denied'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end sm:block">
                   <div className={cn(
                     "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border w-fit whitespace-nowrap",
                     req.status === 'APPROVED' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                     req.status === 'DENIED' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                     "bg-amber-500/10 border-amber-500/20 text-amber-500"
                   )}>
                     {req.status}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-12 border-2 border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center px-8">
             <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white/10" />
             </div>
             <p className="text-sm font-bold text-white/30 tracking-tight">No connection activity yet</p>
             <p className="text-[10px] text-white/10 mt-1 uppercase tracking-widest">Connect patients via EHI ID to start tracking</p>
          </div>
        )}
      </div>
    </div>
  )
}
