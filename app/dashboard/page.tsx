'use client'

import React, { useEffect, useRef } from 'react'
import { ShieldCheck, Clock } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useConsentStore } from '@/store/useConsentStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { formatAuditEventForDisplay } from '@/lib/auditLog'
import { HealthIdentityCard } from '@/components/HealthIdentityCard'
import { PatientRequestInbox } from '@/components/patient/PatientRequestInbox'
import { ActiveAccessList } from '@/components/patient/ActiveAccessList'

import dynamic from 'next/dynamic'
const DoctorHome = dynamic(() => import('@/components/doctor/DoctorHome'), { ssr: false })

export default function DashboardPage() {
  const { patient, initializeKeys, role, firebaseUid } = useUserStore()
  const { loadTokens, activeTokens, revokeToken, accessRequests, loadAccessRequests } = useConsentStore()
  const { loadClinicalData, loadAuditLog, auditEvents } = useClinicalStore()
  const accessSectionRef = React.useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // 1. Initial Load for Identity & Keys
    if (patient) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true
        void initializeKeys()
        void loadTokens()
        void loadClinicalData(patient.id)
        void loadAuditLog(patient.id)
      }

      // 2. Real-time Request Listener (BREAKS CIRCULAR DEPENDENCY)
      // Must be at dashboard level to detect first request while Inbox is hidden
      const pHealthId = (patient.healthId)?.trim().toUpperCase()
      if (firebaseUid) {
        console.log(`[Dashboard] Syncing access requests for: ${firebaseUid}`)
        loadAccessRequests(firebaseUid, false, pHealthId || undefined)
      }
    }
  }, [patient, firebaseUid, initializeKeys, loadTokens, loadClinicalData, loadAuditLog, loadAccessRequests])

  if (role === 'doctor') {
    return <DoctorHome />
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 opacity-50">
        <ShieldCheck className="w-12 h-12 text-white/20 animate-pulse" />
        <p className="text-xs font-bold uppercase tracking-widest text-white/20 text-center">
           Clinical Node Offline
        </p>
      </div>
    )
  }

  const recentAudit = auditEvents.slice(0, 5).map(formatAuditEventForDisplay)

  return (
    <div className="minimalist-grain min-h-[calc(100vh-80px)]">
      <div className="premium-minimalist-content space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Identity Section */}
        <section className="space-y-8">
            <div className="border border-foreground/[0.05] rounded-[40px] overflow-hidden">
             <HealthIdentityCard patient={patient} />
           </div>
        </section>

        {/* Access Center */}
        {accessRequests.some((r: any) => r.status === 'PENDING') && (
          <section ref={accessSectionRef} className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <span className="text-[11px] font-black text-foreground/30 uppercase tracking-[0.4em] block">Security Inbox</span>
            <PatientRequestInbox />
          </section>
        )}

        {/* Active Trust Connections */}
        {activeTokens.length > 0 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <span className="text-[11px] font-black text-foreground/30 uppercase tracking-[0.4em] block">Active Trust Connections</span>
            <ActiveAccessList 
              tokens={activeTokens} 
              onRevoke={(id, reason) => void revokeToken(id, reason)} 
            />
          </section>
        )}

        {/* Activity Ledger */}
        <section className="space-y-8">
          <span className="text-[11px] font-black text-foreground/30 uppercase tracking-[0.4em] block">Security Activity</span>
          <div className="divide-y divide-foreground/[0.05] border-t border-foreground/[0.05]">
            {recentAudit.length > 0 ? recentAudit.map((event) => (
              <div key={event.id} className="zero-border-row group py-6">
                <div className="flex items-center gap-6">
                  <div className="w-2.5 h-2.5 rounded-full ring-4 ring-foreground/[0.02]" style={{ backgroundColor: event.colorToken }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.1em]">
                         {event.relativeTime}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-foreground/10" />
                      <p className="text-[10px] text-foreground/20 font-mono tracking-tighter">
                         {event.displayHash}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-24 flex flex-col items-center justify-center text-center opacity-20">
                 <Clock className="w-8 h-8 mb-4 stroke-1 text-foreground" />
                 <p className="text-xs font-black uppercase tracking-widest text-foreground">Purified Environment • No Activity</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
