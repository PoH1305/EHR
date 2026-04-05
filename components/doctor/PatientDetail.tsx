'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Edit3,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  Upload,
  Sparkles,
  Plus,
  ShieldAlert,
  Clock,
  ChevronRight,
  Activity,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useUserStore } from '@/store/useUserStore'
import { AddPrescriptionModal } from './AddPrescriptionModal'
import { AddNoteModal } from './AddNoteModal'
import FileUploadModal from './FileUploadModal'
import DoctorRecords from './DoctorRecords'

interface PatientDetailProps {
  onBack: () => void
  patientId: string
}

export default function PatientDetail({ onBack, patientId }: PatientDetailProps) {
  const {
    vitals,
    conditions,
    allergies,
    medications,
    loadClinicalData,
    loadPatientMetadata,
    loadAuditLog,
    clearClinicalState,
    selectedPatientProfile,
    isLoading: isClinicalLoading
  } = useClinicalStore()
  const { getUserIdByHealthId } = useUserStore()
  
  const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [showPrescribe, setShowPrescribe] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [, setRefreshAttachments] = useState(0)
  const [loadTimedOut, setLoadTimedOut] = useState(false)

  useEffect(() => {
    const resolveAndLoad = async () => {
      if (!patientId) {
        setResolvedPatientId(null)
        setIsResolving(false)
        return
      }
      
      setIsResolving(true)
      setLoadTimedOut(false)
      clearClinicalState()
      
      let targetUid = patientId
      
      // If it's a Health ID (starts with EHI-), we MUST resolve it to Auth UID
      // because Dexie and clinical_data table use Auth UID as the key.
      if (patientId.startsWith('EHI-')) {
        console.log('[PatientDetail] Resolving Health ID to Auth UID:', patientId)
        const resolved = await getUserIdByHealthId(patientId)
        if (resolved) {
          targetUid = resolved
          console.log('[PatientDetail] Resolved to UID:', resolved)
        } else {
          console.warn('[PatientDetail] Resolution failed for Health ID:', patientId)
          // Resolution failed, but we continue with Health ID (which will trigger the store's guards)
        }
      }
      
      setResolvedPatientId(targetUid)
      
      // Unify: All clinical storage and DB calls use the Auth UID
      // We also pass the original Health ID to ensure the store can perform 
      // permission lookups even before the profile is fully hydrated.
      void loadClinicalData(targetUid, patientId)
      void loadPatientMetadata(targetUid, patientId)
      void loadAuditLog(targetUid)
      
      setIsResolving(false)
    }

    void resolveAndLoad()

    const timer = setTimeout(() => {
      if (useClinicalStore.getState().isLoading) {
        useClinicalStore.setState({ isLoading: false })
        setLoadTimedOut(true)
      }
    }, 10000) // Increased timeout for identity resolution + sync
    
    return () => clearTimeout(timer)
  }, [patientId, getUserIdByHealthId, loadClinicalData, loadPatientMetadata, loadAuditLog, clearClinicalState])

  if (isResolving || (isClinicalLoading && !resolvedPatientId)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-6">
           <Loader2 className="w-10 h-10 text-[#5B8DEF] animate-spin" />
           <div className="text-center space-y-2">
              <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">
                {isResolving ? 'Resolving Identity' : 'Synchronizing Clinical Node'}
              </p>
              <p className="text-[8px] text-white/10 uppercase tracking-widest">
                {isResolving ? 'Resolving Health ID to Clinical UID...' : 'Waiting for decentralized handshake...'}
              </p>
           </div>
        </div>
      </div>
    )
  }

  // Fallback when Supabase found no data or access was not granted
  if (loadTimedOut || (!isClinicalLoading && resolvedPatientId && !useClinicalStore.getState().vitals.length && !useClinicalStore.getState().attachments.length)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-[20px] bg-white/5 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-[#FFB155]" />
          </div>
          <p className="text-sm font-bold text-white/40">Access has not been granted</p>
          <p className="text-[10px] text-white/20 uppercase tracking-widest max-w-[220px] leading-relaxed">
            Please ask the patient to approve your access request in their Medical Vault dashboard.
          </p>
          <button
            onClick={onBack}
            className="mt-2 px-5 py-2 rounded-xl bg-white/5 text-white/40 text-xs font-bold hover:bg-white/10 transition-all border border-white/5"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-24 space-y-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-[#0d1117]/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Back</span>
        </button>
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           <span className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em]">High Alert</span>
        </div>
      </div>

      {/* Patient Profile Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4">
        <div className="flex items-center gap-6">
          <div className="relative">
             <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-[#1A3A8F] to-[#5B8DEF] p-[1px] shadow-2xl shadow-[#5B8DEF]/20">
               <div className="w-full h-full rounded-[31px] bg-[#0d1117] flex items-center justify-center text-2xl font-bold text-white">
                {selectedPatientProfile?.name?.[0] || 'P'}
              </div>
             </div>
             <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-[#0d1117] flex items-center justify-center shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
             </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">{selectedPatientProfile?.name || 'Patient'}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
               <span className="text-[10px] text-[#5B8DEF] font-bold font-mono tracking-tighter bg-[#5B8DEF]/10 border border-[#5B8DEF]/20 px-2.5 py-1 rounded-lg">ID: {patientId}</span>
               {resolvedPatientId && resolvedPatientId !== patientId && (
                 <span className="text-[9px] text-white/10 font-mono tracking-tighter uppercase">UID: {resolvedPatientId.substring(0, 8)}...</span>
               )}
               <span className="text-xs text-white/30 font-medium tracking-tight bg-white/5 px-2.5 py-1 rounded-lg">
                 {selectedPatientProfile?.age || '??'}{selectedPatientProfile?.gender?.[0]?.toUpperCase() || ''} • {selectedPatientProfile?.bloodGroup || 'UNK'} • {selectedPatientProfile?.location || 'Remote'}
               </span>
            </div>
          </div>
        </div>
        
         <div className="flex gap-2 pb-8 -mb-8 no-scrollbar scroll-smooth relative z-40">
            <div 
              className="flex-none px-6 py-4 rounded-2xl flex items-center justify-center gap-3 bg-[#5B8DEF]/20 text-white border border-[#5B8DEF]/40 shadow-lg shadow-[#5B8DEF]/10" 
            >
               <FileText className="w-4 h-4 text-[#5B8DEF]" />
               <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">Clinical Records</span>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in duration-700 max-w-4xl">
         <DoctorRecords 
           patientId={resolvedPatientId || patientId} 
           healthId={patientId}
         />
      </div>

      {/* Floating Action Button (FAB) */}
      <FloatingClinicalActions 
        onPrescribe={() => setShowPrescribe(true)}
        onNote={() => setShowNote(true)}
        onUpload={() => setShowUpload(true)}
      />

      {/* Modals */}
      <AddPrescriptionModal 
        isOpen={showPrescribe}
        onClose={() => setShowPrescribe(false)}
        patientId={resolvedPatientId || patientId}
        patientName={selectedPatientProfile?.name || 'Patient'}
      />
      <AddNoteModal
        isOpen={showNote}
        onClose={() => setShowNote(false)}
        patientId={resolvedPatientId || patientId}
        patientName={selectedPatientProfile?.name || 'Patient'}
      />
      <FileUploadModal 
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false)
          setRefreshAttachments(prev => prev + 1)
        }}
        patientId={resolvedPatientId || patientId}
      />
    </div>
  )
}

function FloatingClinicalActions({ onPrescribe, onNote, onUpload }: { onPrescribe: () => void, onNote: () => void, onUpload: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  const actions = [
    { icon: Edit3, label: 'Prescribe', onClick: onPrescribe, color: 'bg-blue-500' },
    { icon: FileText, label: 'Note', onClick: onNote, color: 'bg-indigo-500' },
    { icon: Upload, label: 'Upload', onClick: onUpload, color: 'bg-emerald-500' },
  ]

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ delay: (actions.length - 1 - i) * 0.05 }}
                className="flex items-center gap-3 group"
              >
                <span className="px-3 py-1.5 rounded-xl bg-[#0d1117] border border-white/10 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                  {action.label}
                </span>
                <button
                  onClick={() => {
                    action.onClick()
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all active:scale-90",
                    action.color
                  )}
                >
                  <action.icon className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-[24px] bg-[#5B8DEF] text-white flex items-center justify-center shadow-2xl shadow-[#5B8DEF]/30 transition-all active:scale-95",
          isOpen ? "rotate-45 bg-[#161b22]" : ""
        )}
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  )
}
