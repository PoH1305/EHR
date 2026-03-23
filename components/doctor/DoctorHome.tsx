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
import EmergencyOverrideModal from './EmergencyOverrideModal'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'

export default function DoctorHome() {
  const { priorityQueue, runClinicalTriage, isSuspicious, lastAnomaly, checkSecurityPulse } = useAgentStore()
  const { activateEmergencyMode } = useClinicalStore()
  const { firebaseEmail, setIsAddPatientOpen } = useUserStore()
  const [isPrivacyMode] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  
  const [isOverrideOpen, setIsOverrideOpen] = useState(false)
  const [stats, setStats] = useState({
    todayPatients: 12,
    pendingReview: 3,
    criticalCases: 1
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!db) return
      try {
        await runClinicalTriage()
        const patientCount = await db.patient_profiles.count()
        const requestCount = await db.access_requests.where('status').equals('pending').count()
        setStats({
          todayPatients: patientCount,
          criticalCases: priorityQueue.length, 
          pendingReview: requestCount
        })
        toast("Clinical Node Synchronized", "success")
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [runClinicalTriage, priorityQueue.length, toast])

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
           <p className="text-sm text-white/30 font-medium mt-1">{firebaseEmail?.split('@')[0] || 'Dr. Practitioner'}</p>
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
      <div className="grid grid-cols-3 gap-4">
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
             { time: "11:30", name: "Urgent Review", reason: "AI Flagged Anomaly", status: "URGENT", theme: "bg-red-600/10 text-red-500 border border-red-500/20" },
           ].map((round, j) => (
              <motion.div
                key={round.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * j }}
                className="bg-[#111827]/30 border border-white/[0.03] p-5 rounded-[32px] flex items-center justify-between group hover:bg-[#111827]/50 transition-all cursor-pointer"
                onClick={() => router.push('/patients')}
              >
                  <div className="flex items-center gap-6">
                     <span className="text-sm font-black text-[#5B8DEF] tracking-tight">{round.time}</span>
                     <div>
                        <p className="text-sm font-black text-white" data-privacy="true">{round.name}</p>
                        <p className="text-[10px] text-white/20 font-medium mt-0.5">{round.reason}</p>
                     </div>
                  </div>
                  <main 
                    data-privacy-mode={isPrivacyMode}
                    className={cn(
                                "px-4 py-1.5 rounded-full text-[8px] font-black tracking-widest uppercase",
                                round.theme
                              )}>
                     {round.status}
                  </main>
              </motion.div>
           ))}
        </div>
      </div>

      {/* Emergency Quick Action */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group cursor-pointer pt-6"
        onClick={() => setIsOverrideOpen(true)}
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-600 rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-500" />
        <div className="relative bg-[#0a0202] border border-red-500/10 p-8 rounded-[32px] flex flex-col md:flex-row items-center gap-8 overflow-hidden shadow-2xl">
           <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-black text-white tracking-tight">Emergency Break-Glass Override</h2>
              <p className="text-sm text-red-500/40 mt-1 max-w-xl italic">
                 Unauthorized access protocol for life-critical scenarios.
              </p>
           </div>
           <div className="shrink-0 bg-red-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 active:scale-95 transition-all">
              Activate Protocol
           </div>
        </div>
      </motion.div>

      <EmergencyOverrideModal 
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        patientId="pat-001" 
        onActivated={() => {
          activateEmergencyMode("pat-001")
          router.push('/patients/pat-001')
        }}
      />
    </div>
  )
}
