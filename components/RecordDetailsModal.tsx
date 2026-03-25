'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Pill, AlertCircle, Activity, Heart, ShieldAlert, BadgeCheck, ShieldCheck, ExternalLink } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { RecordItem } from './RecordList'

interface RecordDetailsModalProps {
  isOpen: boolean
  record: RecordItem | null
  onClose: () => void
}

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  Condition: <Heart className="w-5 h-5 text-red-400" />,
  MedicationRequest: <Pill className="w-5 h-5 text-blue-400" />,
  AllergyIntolerance: <AlertCircle className="w-5 h-5 text-amber-400" />,
  Observation: <Activity className="w-5 h-5 text-green-400" />,
  DiagnosticReport: <FileText className="w-5 h-5 text-purple-400" />,
}

const RESOURCE_LABELS: Record<string, string> = {
  Condition: 'Clinical Condition',
  MedicationRequest: 'Prescription',
  AllergyIntolerance: 'Allergy Record',
  Observation: 'Vitals / Observation',
  DiagnosticReport: 'Lab Report',
}

export function RecordDetailsModal({ isOpen, record, onClose }: RecordDetailsModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && record && (
        <React.Fragment key="record-modal-backdrop">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[110] p-6 pb-12 glass-card rounded-b-none border-b-0 max-h-[85vh] overflow-y-auto"
          >
            {/* Handle bar for mobile feel */}
            <div className="w-12 h-1.5 bg-foreground/20 rounded-full mx-auto mb-6" />

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-foreground/[0.05] flex items-center justify-center flex-shrink-0 border border-foreground/10">
                  {RESOURCE_ICONS[record.resourceType] || <FileText className="w-5 h-5 text-foreground/50" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-foreground leading-tight truncate break-all">{record.title}</h2>
                  <p className="text-sm text-foreground/50">{RESOURCE_LABELS[record.resourceType] || record.resourceType}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-foreground/[0.05] hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-6">
              {/* Status & Sensitivity Flags */}
              <div className="flex flex-wrap gap-2">
                {record.sensitive && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Highly Sensitive PHI
                  </div>
                )}
                
                {record.status && (
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium",
                    record.status === 'active' && "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
                    record.status === 'resolved' && "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
                    record.status === 'inactive' && "bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400"
                  )}>
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Clinical Status: <span className="uppercase">{record.status}</span>
                  </div>
                )}
              </div>
              
              {/* Note on Clinical Statuses based on user asking "what are the labels" */}
              {record.status && (
                <p className="text-[11px] text-foreground/30 italic mt-0">
                  * Note: The &apos;{record.status}&apos; label is the standardized FHIR clinical status indicating whether this record represents a current, past (resolved), or inactive medical finding.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-foreground/[0.03] border border-foreground/5">
                  <p className="text-xs text-foreground/40 mb-1">Date Recorded</p>
                  <p className="text-sm font-medium text-foreground">{new Date(record.date).toLocaleDateString()}</p>
                  <p className="text-[10px] text-foreground/30 mt-0.5">{formatRelativeTime(record.date)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-foreground/[0.03] border border-foreground/5">
                  <p className="text-xs text-foreground/40 mb-1">Record ID</p>
                  <p className="text-sm font-mono text-foreground/80 truncate">...{record.id.slice(-8)}</p>
                  <p className={cn(
                    "text-[10px] items-center flex gap-1 mt-0.5",
                    record.verified ? "text-blue-500 dark:text-blue-400/80" : "text-foreground/30"
                  )}>
                    {record.verified ? <ShieldCheck className="w-3 h-3" /> : null}
                    {record.verified ? 'Blockchain Verified' : 'Local Record'}
                  </p>
                </div>
              </div>

              {/* Extensive Subtitle / Details */}
              <div className="p-5 rounded-2xl bg-foreground/[0.03] border border-foreground/10">
                <h3 className="text-sm font-medium text-foreground/80 mb-2">Record Details</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {record.subtitle}
                </p>
                
                {/* Mocked extra clinical data to make it look detailed */}
                <div className="mt-4 pt-4 border-t border-foreground/5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-foreground/40">Data Source</span>
                    {record.verified ? (
                      <span className="text-foreground/80 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        City General Hospital Node
                      </span>
                    ) : (
                      <span className="text-orange-500 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Patient Uploaded
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-foreground/40">Verification Standard</span>
                    {record.verified ? (
                      <span className="text-blue-500 dark:text-blue-400 font-mono flex items-center gap-1.5">
                        <BadgeCheck className="w-3 h-3" />
                        HL7 FHIR R4 (EHR Verified)
                      </span>
                    ) : (
                      <span className="text-foreground/60 font-mono">
                        Not Verified (Self-Reported)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Document Button */}
              {record.fileUrl && (
                <div className="pt-2">
                  <a
                    href={record.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-semibold hover:bg-primary/20 transition-all group"
                  >
                    <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    View Full Report / Image
                  </a>
                  <p className="text-[10px] text-center text-foreground/30 mt-2 italic">
                    Note: Files are stored locally in your browser&apos;s encrypted vault.
                  </p>
                </div>
              )}

              {/* Always-visible View Record action */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    const recordData = JSON.stringify(record, null, 2)
                    const blob = new Blob([recordData], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${record.title.replace(/\s+/g, '_')}_${record.id.slice(-6)}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                  className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-foreground/[0.05] border border-foreground/10 text-foreground/70 font-semibold hover:bg-foreground/10 hover:text-foreground transition-all group"
                >
                  <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  View Record (Download JSON)
                </button>
              </div>

            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>,
    document.body
  )
}
