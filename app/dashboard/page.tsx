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
  const { patient, initializeKeys, role } = useUserStore()
  const { loadTokens, activeTokens, revokeToken } = useConsentStore()
  const { loadClinicalData, loadAuditLog, auditEvents } = useClinicalStore()
  const accessSectionRef = React.useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    const init = async () => {
      if (!patient) await initializeKeys()
      
      const { firebaseUid } = useUserStore.getState()
      const targetId = firebaseUid || patient?.id

      if (targetId && !hasLoadedRef.current && !targetId.startsWith('pat-')) {
        hasLoadedRef.current = true
        void loadClinicalData(targetId)
        void loadAuditLog(targetId)
        void loadTokens()
      }
    }
    init()
  }, [patient?.id, loadClinicalData, loadAuditLog, loadTokens, initializeKeys])

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
           <div className="space-y-2">
             <h1 className="font-plus-jakarta text-4xl font-extrabold text-foreground tracking-tight">Vault Overview</h1>
             <p className="text-sm text-foreground/40 font-medium tracking-wide">
               Subject: {patient.name} · Node: {patient.healthId}
             </p>
           </div>
           
           <div className="border border-white/5 rounded-[40px] overflow-hidden">
             <HealthIdentityCard patient={patient} />
           </div>
        </section>

        {/* Access Center */}
        <section ref={accessSectionRef} className="space-y-8">
          <span className="text-[11px] font-bold text-white/10 uppercase tracking-[0.3em] block">Security Inbox</span>
          <PatientRequestInbox />
        </section>

        {/* Active Trust Connections */}
        <section className="space-y-8">
          <span className="text-[11px] font-bold text-white/10 uppercase tracking-[0.3em] block">Active Access List</span>
          <ActiveAccessList 
            tokens={activeTokens} 
            onRevoke={(id, reason) => void revokeToken(id, reason)} 
          />
        </section>

        {/* Activity Ledger */}
        <section className="space-y-8">
          <span className="text-[11px] font-bold text-white/10 uppercase tracking-[0.3em] block">Activity Ledger</span>
          <div className="divide-y divide-white/5 border-t border-white/5">
            {recentAudit.length > 0 ? recentAudit.map((event) => (
              <div key={event.id} className="zero-border-row group">
                <div className="flex items-center gap-6">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: event.colorToken }} />
                  <div>
                    <p className="text-base font-semibold text-white group-hover:text-white/80 transition-colors">
                      {event.description}
                    </p>
                    <p className="text-[10px] text-white/20 font-medium uppercase tracking-wider mt-0.5">
                       {event.relativeTime} · {event.displayHash}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                 <Clock className="w-8 h-8 mb-4 stroke-1" />
                 <p className="text-sm font-bold tracking-tight">No recorded activity</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
