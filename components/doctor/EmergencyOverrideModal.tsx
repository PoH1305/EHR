'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ShieldAlert, Check, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { useToast } from '@/store/useToast'

interface EmergencyOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  onActivated: (justification: string) => void
}

export default function EmergencyOverrideModal({ isOpen, onClose, patientId, onActivated }: EmergencyOverrideModalProps) {
  const { toast } = useToast()
  const [justification, setJustification] = useState('')
  const [isActivating, setIsActivating] = useState(false)

  const handleActivate = async () => {
    if (justification.length < 10) {
      toast("Please provide a valid clinical justification", "error")
      return
    }

    setIsActivating(true)
    try {
      // 1. Log the Security Alert
      if (db) {
        await db.audit_log.add({
          id: Math.random().toString(36).substring(2, 15),
          type: 'EMERGENCY_ACCESS_ACTIVATED',
          timestamp: new Date().toISOString(),
          userId: 'EMERGENCY_RESPONDER_001',
          description: `Emergency Override activated for Patient ${patientId}`,
          metadata: { patientId, justification, severity: 'CRITICAL' },
          hash: '0x...',
          previousHash: '0x...'
        })
      }

      toast("EMERGENCY OVERRIDE ACTIVATED", "info")
      onActivated(justification)
      onClose()
    } catch {
      toast("Failed to activate override", "error")
    } finally {
      setIsActivating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-red-950/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className="relative w-full max-w-lg bg-[#0d0404] border border-red-500/30 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]"
      >
        {/* Warning Banner */}
        <div className="bg-red-500 py-3 px-8 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Break-Glass Override</span>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Consented Access Bypass</h3>
              <p className="text-sm text-red-500/60 leading-relaxed mt-1">
                You are about to access protected health information without patient consent. This event is being recorded by the **MedVault Guardian** agent.
              </p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                   <Info className="w-3 h-3" />
                   Legal Accountability
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed italic">
                  &quot;I understand that unauthorized access to medical records is a punishable offense. I certify that this access is for an emergency medical situation where the patient is unable to grant consent.&quot;
                </p>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-red-500/40 uppercase tracking-widest ml-1 block">Clinical Justification</label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="e.g. Unconscious patient, trauma assessment, internal hemorrhage..."
                  className="w-full bg-white/5 border border-red-500/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-red-500/40 h-32 transition-colors resize-none"
                />
             </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-red-500/5 border-t border-red-500/10 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleActivate}
            disabled={isActivating || justification.length < 10}
            className={cn(
              "px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3",
              justification.length < 10 
                ? "bg-white/5 text-white/10 cursor-not-allowed" 
                : "bg-red-500 text-white hover:bg-red-600 shadow-xl shadow-red-500/20 active:scale-95"
            )}
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing
              </>
            ) : (
              <>
                Confirm Override
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
