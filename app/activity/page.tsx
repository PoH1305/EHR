'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useUserStore } from '@/store/useUserStore'
import { verifyAuditChain, formatAuditEventForDisplay } from '@/lib/auditLog'
import { GlassCard } from '@/components/GlassCard'
import type { AuditChainVerification, DisplayAuditEvent } from '@/lib/types'

import AccessRequestList from '@/components/AccessRequestList'

export default function ActivityPage() {
  const [verification, setVerification] = useState<AuditChainVerification | null>(null)
  const [displayEvents, setDisplayEvents] = useState<DisplayAuditEvent[]>([])
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  const { auditEvents, loadAuditLog } = useClinicalStore()
  const { patient } = useUserStore()

  useEffect(() => {
    if (patient) {
      void loadAuditLog(patient.id)
    }
  }, [patient, loadAuditLog])

  // Chain verification logic could be added here for real events if needed
  useEffect(() => {
    const verify = async () => {
      if (auditEvents.length > 0) {
        const result = await verifyAuditChain(auditEvents)
        setVerification(result)
        setDisplayEvents(auditEvents.map(formatAuditEventForDisplay).reverse())
      }
    }
    void verify()
  }, [auditEvents])

  return (
    <div className="space-y-5">
      <AccessRequestList />
      
      <h1 className="text-xl font-bold text-foreground">Activity Log</h1>

      {/* Chain verification badge */}
      {verification && (
        <GlassCard className={cn(
          'p-4',
          verification.valid ? 'border-green-500/20' : 'border-red-500/20'
        )}>
          <div className="flex items-center gap-3">
            {verification.valid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className={cn(
                'text-sm font-semibold',
                verification.valid ? 'text-green-400' : 'text-red-400'
              )}>
                {verification.valid ? 'Chain Intact ✓' : `⚠ Chain Broken at Event #${verification.brokenAt}`}
              </p>
              <p className="text-[10px] text-foreground/30 mt-0.5">
                {verification.message} — {verification.totalEvents} total events
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Audit entries */}
      <div className="space-y-2">
        {displayEvents.map((event) => (
          <GlassCard
            key={event.id}
            className="p-4 cursor-pointer hover:bg-foreground/[0.04] transition-colors"
            onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                style={{ backgroundColor: `${event.colorToken}15`, color: event.colorToken }}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground/80">{event.description}</p>
                  {expandedEvent === event.id ? (
                    <ChevronUp className="w-4 h-4 text-foreground/20 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-foreground/20 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-foreground/30">{event.relativeTime}</span>
                  <span className="text-[10px] text-foreground/15 font-mono">{event.displayHash}</span>
                </div>

                {/* Expanded details */}
                {expandedEvent === event.id && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-foreground/20">Event Type</span>
                        <p className="text-foreground/50 mt-0.5">{event.type}</p>
                      </div>
                      <div>
                        <span className="text-foreground/20">Timestamp</span>
                        <p className="text-foreground/50 mt-0.5">{new Date(event.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-foreground/20">Full Hash</span>
                      <p className="text-foreground/40 mt-0.5 font-mono break-all text-[9px]">{event.hash}</p>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-foreground/20">Previous Hash</span>
                      <p className="text-foreground/40 mt-0.5 font-mono break-all text-[9px]">{event.previousHash}</p>
                    </div>
                    {Object.keys(event.metadata).length > 0 && (
                      <div className="text-[10px]">
                        <span className="text-foreground/20">Metadata</span>
                        <pre className="text-foreground/30 mt-0.5 text-[9px] overflow-x-auto">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
