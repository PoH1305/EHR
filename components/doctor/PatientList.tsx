'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, ChevronRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { PatientProfile } from '@/lib/types'
import { useUserStore } from '@/store/useUserStore'

interface PatientListProps {
  onSelect: (id: string) => void
}

export default function PatientList({ onSelect }: PatientListProps) {
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { firebaseUid } = useUserStore()

  useEffect(() => {
    async function fetchApprovedPatients() {
      if (!firebaseUid) return
      setIsLoading(true)
      try {
        const { supabase } = await import('@/lib/supabase')

        // 1. First, get ONLY approved access requests for this doctor
        const { data: approvedRequests, error: reqError } = await supabase
          .from('access_requests')
          .select('patient_id, patient_name')
          .eq('doctor_id', firebaseUid)
          .eq('status', 'APPROVED')

        if (reqError) throw reqError

        if (!approvedRequests || approvedRequests.length === 0) {
          setPatients([])
          setIsLoading(false)
          return
        }

        // 2. Fetch profiles ONLY for approved patients (by EHI ID)
        const approvedEhiIds = approvedRequests.map(r => r.patient_id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('health_id', approvedEhiIds)

        if (profileError) throw profileError

        // 3. Merge request data with profile data (Fallback for missing profiles)
        const approvedPatients = approvedRequests.map(req => {
          const profile = (profileData || []).find(p => p.health_id === req.patient_id)
          
          if (profile) {
            return {
              ...profile.data,
              id: profile.id,
              healthId: profile.health_id
            }
          }

          // Fallback: Use data from the access request itself
          return {
            id: req.patient_id, // Use EHI ID as stable ID if profile missing
            name: req.patient_name || 'Authorized Patient',
            healthId: req.patient_id,
            age: '??',
            gender: 'Unknown',
            bloodGroup: 'UNK'
          }
        }) as PatientProfile[]

        setPatients(approvedPatients)
      } catch (error) {
        console.error('Failed to fetch approved patients:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchApprovedPatients()
  }, [firebaseUid])

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.healthId?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#5B8DEF] animate-spin mb-4" />
        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Accessing Patient Roster</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Patients</h1>
        <button className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-white/40 hover:bg-white/5 transition-all">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#5B8DEF] transition-colors" />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or EHI ID..." 
          className="w-full bg-[#111827]/30 border border-white/[0.05] rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#5B8DEF]/40 transition-all placeholder:text-white/10"
        />
      </div>

      <div className="space-y-3">
        {filteredPatients.length > 0 ? filteredPatients.map((p, i) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(p.id)}
            className="bg-[#111827]/40 border border-white/[0.03] p-4 rounded-[28px] flex items-center gap-4 hover:bg-white/[0.02] hover:border-white/10 active:scale-[0.98] transition-all cursor-pointer group shadow-lg shadow-black/20"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold border border-white/5",
              "bg-[#1A3A8F]/20 text-[#5B8DEF]"
            )}>
              {(p?.name?.[0] || 'P').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 overflow-hidden">
                <span className="text-base font-bold text-white tracking-tight truncate">{p?.name || 'Anonymous Patient'}</span>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/5 shrink-0",
                  "bg-white/5 text-white/40"
                )}>
                  Stable
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 overflow-hidden">
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider shrink-0">
                  {p.age || '??'}{p.gender?.[0]?.toUpperCase() || ''} • {p.bloodGroup || 'UNK'}
                </span>
                <span className="text-white/10 text-[8px] shrink-0">•</span>
                <span className="text-[10px] text-white/20 font-mono truncate">{p.healthId}</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/5 flex items-center justify-center transition-all">
               <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-10">
             <p className="text-xs text-white/20 uppercase tracking-widest font-bold">No patients found</p>
          </div>
        )}
      </div>
    </div>
  )
}
