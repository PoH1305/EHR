'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, Share2, ShieldCheck } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useConsentStore } from '@/store/useConsentStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { formatAuditEventForDisplay } from '@/lib/auditLog'
import { GlassCard } from '@/components/GlassCard'
import { HealthIdentityCard } from '@/components/HealthIdentityCard'
import { ConsentTokenCard } from '@/components/ConsentTokenCard'
import { AISummaryModal } from '@/components/AISummaryModal'
import { ShareRecordsModal } from '@/components/ShareRecordsModal'
import type { ConsentTokenRequest, ConsentToken } from '@/lib/types'
import { EmergencyAccessNotification } from '@/components/patient/EmergencyAccessNotification'
import { PatientRequestInbox } from '@/components/patient/PatientRequestInbox'

import dynamic from 'next/dynamic'

const DoctorHome = dynamic(() => import('@/components/doctor/DoctorHome'), { ssr: false })

export default function DashboardPage() {
  const { patient, initializeKeys, role } = useUserStore()
  const { loadTokens, activeTokens, revokeToken } = useConsentStore()
  const { loadClinicalData, loadAuditLog, auditEvents } = useClinicalStore()
  const [showSummary, setShowSummary] = useState(false)
  const [showShare, setShowShare] = useState(false)

  useEffect(() => {
    const init = async () => {
      // If no patient in state, attempt to load from local storage/keys
      if (!patient) {
        await initializeKeys()
      }
      
      if (patient) {
        void loadClinicalData(patient.id)
        void loadAuditLog(patient.id)
        void loadTokens()
      }
    }
    
    void init()
  }, [patient?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (role === 'doctor') {
    return (
      <div className="p-5 max-w-md mx-auto">
        <DoctorHome />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <ShieldCheck className="w-16 h-16 text-blue-500 animate-pulse" />
        <h2 className="text-xl font-bold">No Patient Profile Loaded</h2>
        <p className="text-center text-foreground/50 text-sm">
          Please link your Health ID or ingest your medical records to initialize your Clinical Node.
        </p>
      </div>
    )
  }

  const recentAudit = auditEvents.slice(0, 3).map(formatAuditEventForDisplay)

  const handleGenerateToken = async (request: ConsentTokenRequest) => {
    const { generateToken } = useConsentStore.getState()
    await generateToken(request)
  }

  const latestEmergency = auditEvents.find(e => e.type === 'EMERGENCY_ACCESS_TRIGGERED')

  return (
    <div className="space-y-6">
      {latestEmergency && (
        <EmergencyAccessNotification 
          date={new Date(latestEmergency.timestamp).toLocaleDateString()}
          time={new Date(latestEmergency.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        />
      )}


      <PatientRequestInbox />

      {/* Health Identity Card */}
      <section>
        <HealthIdentityCard patient={patient} />
      </section>

      {/* Action buttons */}
      {/* Action buttons */}
      <section className="flex gap-4 px-1">
        <button
          onClick={() => setShowSummary(true)}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full bg-[#0a0f1a] border border-white/40 hover:bg-slate-900 transition-all shadow-lg"
        >
          <Sparkles className="w-5 h-5 text-[#bf7af0]" />
          <span className="text-base font-bold text-white tracking-tight">AI Summary</span>
        </button>
        <button
          onClick={() => setShowShare(true)}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-[20px] bg-[#0d2d2d] hover:bg-[#123d3d] transition-all shadow-lg"
        >
          <Share2 className="w-5 h-5 text-[#2ed3b7]" />
          <span className="text-base font-bold text-white tracking-tight">Share Records</span>
        </button>
      </section>

      {/* Active Consent Tokens */}
      {activeTokens.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground/40 mb-3">Active Consent Tokens</h3>
          <div className="space-y-3">
            {activeTokens.map((token: ConsentToken) => (
              <ConsentTokenCard
                key={token.id}
                token={token}
                onRevoke={(id, reason) => void revokeToken(id, reason)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <h3 className="text-sm font-semibold text-foreground/40 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {recentAudit.map((event) => (
            <GlassCard key={event.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-foreground/[0.05] flex items-center justify-center flex-shrink-0 text-xs" style={{ color: event.colorToken }}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/70">{event.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-foreground/30">{event.relativeTime}</span>
                    <span className="text-[10px] text-foreground/15 font-mono">{event.displayHash}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Modals */}
      {patient && (
        <>
          <AISummaryModal
            isOpen={showSummary}
            onClose={() => setShowSummary(false)}
            patientId={patient.id}
          />
          <ShareRecordsModal
            isOpen={showShare}
            onClose={() => setShowShare(false)}
            onConfirm={handleGenerateToken}
            patientId={patient.id}
          />
        </>
      )}
    </div>
  )
}
