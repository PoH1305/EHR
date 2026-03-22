'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Check, X, Bell } from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'
import { GlassCard } from '@/components/GlassCard'
import { AccessApprovalModal } from './AccessApprovalModal'
import type { AccessRequest } from '@/lib/types'

export default function AccessRequestList() {
  const { accessRequests, respondToAccessRequest } = useConsentStore()
  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING')
  const [selectedRequest, setSelectedRequest] = React.useState<AccessRequest | null>(null)

  if (pendingRequests.length === 0) return null

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2 px-1">
        <Bell className="w-4 h-4 text-primary animate-pulse" />
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground/40">Pending Access Requests</h2>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <GlassCard className="p-4 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground/90">{req.doctorName}</h3>
                      <p className="text-[10px] text-foreground/40 mt-0.5">{req.organization}</p>
                      <p className="text-[10px] bg-primary/5 text-primary/60 inline-block px-2 py-0.5 rounded-full mt-2 font-mono">
                        ID: {req.patientId}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-90"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => respondToAccessRequest(req.id, false)}
                      className="p-2.5 rounded-xl bg-foreground/5 text-foreground/40 hover:bg-foreground/10 transition-all active:scale-90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-[9px] text-foreground/20 mt-4 text-right">
                  Requested {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {selectedRequest && (
        <AccessApprovalModal 
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
        />
      )}
    </div>
  )
}
