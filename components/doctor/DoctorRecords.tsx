'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  Loader2, 
  FileText, 
  Pill, 
  Activity,
  AlertCircle,
  User, 
  Eye,
  ShieldCheck,
  Lock,
  Stethoscope,
  FlaskConical,
  Paperclip
} from 'lucide-react'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { DoctorSpecialty } from '@/lib/types'
import { FileTypeBadge } from '@/components/FileTypeBadge'

interface DoctorRecordsProps {
   patientId?: string | null
}

const VIEW_ONLY_CATEGORIES = [
  { key: 'medications', label: 'Prescriptions', icon: Pill, color: 'blue' },
  { key: 'conditions', label: 'Conditions', icon: Stethoscope, color: 'rose' },
  { key: 'allergies', label: 'Allergies', icon: AlertCircle, color: 'amber' },
  { key: 'clinicalNotes', label: 'Notes', icon: FileText, color: 'indigo' },
  { key: 'vitals', label: 'Vitals', icon: Activity, color: 'emerald' },
  { key: 'attachments', label: 'Labs / Files', icon: Paperclip, color: 'purple' },
]

const ICON_COLORS: Record<string, string> = {
  blue: 'text-blue-400 bg-blue-500/10',
  rose: 'text-rose-400 bg-rose-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  indigo: 'text-indigo-400 bg-indigo-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
}

export default function DoctorRecords({ patientId }: DoctorRecordsProps) {
   const [activeTab, setActiveTab] = useState('medications')

   const {
      vitals,
      conditions,
      medications,
      allergies,
      clinicalNotes,
      attachments,
      selectedPatientProfile,
   } = useClinicalStore()

   const { 
      accessRequests, 
      loadAccessRequests 
   } = useConsentStore()
   
   const { firebaseUid } = useUserStore()
   const [backendRecords, setBackendRecords] = useState<any[]>([])

   const loadBackendRecords = async (pid: string) => {
      try {
         const response = await fetch(`http://localhost:8000/records/${pid}`)
         if (response.ok) {
            const data = await response.json()
            setBackendRecords(data)
         }
      } catch (error) {
         console.error('Failed to load backend records:', error)
      }
   }

   useEffect(() => {
      if (patientId) {
         loadBackendRecords(patientId)
      }
   }, [patientId])

   const hasListenedRef = useRef(false)



   useEffect(() => {
      if (firebaseUid && !hasListenedRef.current) {
         hasListenedRef.current = true
         void loadAccessRequests(firebaseUid, true)
      }
   }, [firebaseUid, loadAccessRequests])

   // Find the APPROVED access request for this patient to determine shared categories
   const approvedRequest = accessRequests.find(r =>
      r.patientId === patientId && r.status === 'APPROVED'
   )
   const sharedCats: string[] = approvedRequest?.sharedCategories || []

   // Only show tabs for categories that were approved
   const visibleTabs = VIEW_ONLY_CATEGORIES.filter(cat =>
      sharedCats.length === 0 || sharedCats.includes(cat.key)
   )

   // Set the first visible tab by default if current tab is hidden
   const effectiveTab = visibleTabs.find(t => t.key === activeTab) ? activeTab : (visibleTabs[0]?.key || 'medications')

   const renderContent = () => {
      // Loading state is managed by PatientDetail above — just show empty state here
      switch (effectiveTab) {
         case 'medications':
            return medications.length > 0 ? medications.map((m, i) => (
               <ViewOnlyCard key={m.id || i} color="blue" icon={<Pill className="w-4 h-4 text-blue-400" />}>
                  <p className="font-bold text-white text-sm">{m.medicationCodeableConcept?.text || 'Unknown Medication'}</p>
                  <p className="text-xs text-white/40 mt-1">{m.dosageInstruction?.[0]?.text || 'See notes'}</p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                     <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                        m.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/20'
                     )}>{m.status}</span>
                     <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                        {m.authoredOn ? new Date(m.authoredOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                     </span>
                  </div>
               </ViewOnlyCard>
            )) : <EmptyState icon={<Pill className="w-8 h-8 text-white/10" />} label="No prescriptions shared" />

         case 'conditions':
            return conditions.length > 0 ? conditions.map((c, i) => (
               <ViewOnlyCard key={c.id || i} color="rose" icon={<Stethoscope className="w-4 h-4 text-rose-400" />}>
                  <p className="font-bold text-white text-sm">{c.code?.text || c.code?.coding?.[0]?.display || 'Unknown Condition'}</p>
                  <p className="text-xs text-white/30 font-mono mt-1">ICD-10: {c.code?.coding?.[0]?.code || 'N/A'}</p>
                  <div className="mt-3 pt-3 border-t border-white/5">
                     <span className="text-[9px] font-bold text-rose-400/60 uppercase tracking-widest">
                        {c.clinicalStatus?.coding?.[0]?.code || 'unknown status'}
                     </span>
                  </div>
               </ViewOnlyCard>
            )) : <EmptyState icon={<Stethoscope className="w-8 h-8 text-white/10" />} label="No conditions shared" />

         case 'allergies':
            return allergies.length > 0 ? allergies.map((a, i) => (
               <ViewOnlyCard key={a.id || i} color="amber" icon={<AlertCircle className="w-4 h-4 text-amber-400" />}>
                  <p className="font-bold text-white text-sm">{(a.code as any)?.text || (a.code as any)?.coding?.[0]?.display || 'Unknown Allergen'}</p>
                  <p className="text-xs text-white/40 mt-1">
                     Criticality: <span className="text-amber-400 font-semibold">{a.criticality || 'unknown'}</span>
                  </p>
               </ViewOnlyCard>
            )) : <EmptyState icon={<AlertCircle className="w-8 h-8 text-white/10" />} label="No allergies shared" />

         case 'clinicalNotes':
            return clinicalNotes.length > 0 ? clinicalNotes.map((note, i) => (
               <ViewOnlyCard key={note.id || i} color="indigo" icon={<FileText className="w-4 h-4 text-indigo-400" />}>
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{note.type?.replace('_', ' ')}</span>
                     <span className="text-[9px] text-white/20">{new Date(note.timestamp).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap select-none">{note.content}</p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                     <User className="w-3 h-3 text-white/20" />
                     <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{note.doctorName || 'Unknown Author'}</span>
                  </div>
               </ViewOnlyCard>
            )) : <EmptyState icon={<FileText className="w-8 h-8 text-white/10" />} label="No notes shared" />

         case 'vitals':
            return vitals.length > 0 ? vitals.map((v, i) => (
               <ViewOnlyCard key={v.type || i} color="emerald" icon={<Activity className="w-4 h-4 text-emerald-400" />}>
                  <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">{v.type}</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-black text-white tracking-tighter">{v.latestValue}</span>
                     <span className="text-xs font-bold text-white/30">{v.unit}</span>
                  </div>
               </ViewOnlyCard>
            )) : <EmptyState icon={<Activity className="w-8 h-8 text-white/10" />} label="No vitals shared" />

         case 'attachments':
            const allAttachments = [
               ...attachments.map(att => ({ ...att, source: 'local' })),
               ...backendRecords.map(rec => ({
                  id: rec.id,
                  fileName: rec.filename,
                  fileType: rec.file_type,
                  fileSize: 0, // Not stored in DB currently, but could be
                  uploadedAt: rec.uploaded_at,
                  category: 'LAB_REPORT',
                  source: 'backend'
               }))
            ].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

            return allAttachments.length > 0 ? allAttachments.map((att: any, i) => (
               <ViewOnlyCard key={att.id || i} color="purple" icon={<Paperclip className="w-4 h-4 text-purple-400" />}>
                  <div className="flex items-start justify-between gap-2">
                     <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{att.fileName}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <FileTypeBadge fileName={att.fileName} mimeType={att.fileType ?? undefined} />
                           <span className="text-[10px] text-white/30 uppercase tracking-widest">
                              {att.category?.replace('_', ' ')} {att.fileSize > 0 ? `· ${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                           </span>
                           {att.source === 'backend' && (
                              <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest">Server</span>
                           )}
                        </div>
                     </div>
                     <a 
                        href={att.source === 'backend' ? `http://localhost:8000/download/${att.id}` : '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={cn(
                           "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 transition-colors",
                           att.source === 'backend' 
                              ? "bg-primary/10 border-primary/20 hover:bg-primary/20" 
                              : "bg-purple-500/10 border-purple-500/20"
                        )}
                        onClick={(e) => {
                           if (att.source !== 'backend') {
                              e.preventDefault()
                              alert('Local-only files cannot be downloaded directly. Please wait for sync.')
                           }
                        }}
                     >
                        {att.source === 'backend' ? (
                           <>
                              <Activity className="w-3 h-3 text-primary" />
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Download</span>
                           </>
                        ) : (
                           <>
                              <Eye className="w-3 h-3 text-purple-400" />
                              <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">View Only</span>
                           </>
                        )}
                     </a>
                  </div>
                  <p className="text-[9px] text-white/15 mt-3 font-bold uppercase tracking-widest">
                     Uploaded {new Date(att.uploadedAt).toLocaleDateString()}
                  </p>
               </ViewOnlyCard>
            )) : <EmptyState icon={<FlaskConical className="w-8 h-8 text-white/10" />} label="No lab files shared" />

         default:
            return <EmptyState icon={<Lock className="w-8 h-8 text-white/10" />} label="No data available" />
      }
   }

   if (visibleTabs.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center">
               <ShieldCheck className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-xs font-bold text-white/20 uppercase tracking-widest text-center">
               No clinical categories have been shared by this patient
            </p>
         </div>
      )
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-24">
         {/* Header */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-[#5B8DEF]/10 flex items-center justify-center text-lg font-bold text-[#5B8DEF]">
                  {selectedPatientProfile?.name?.[0] || 'P'}
               </div>
               <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">{selectedPatientProfile?.name || 'Patient'}</h1>
                  <div className="text-[10px] text-white/20 tracking-[0.2em] font-bold uppercase mt-0.5">
                     Clinical Records • Read-Only Access
                  </div>
               </div>
            </div>
            {/* View-Only global badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
               <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">View Only</span>
            </div>
         </div>

         {/* Shared categories info */}
         {sharedCats.length > 0 && (
            <div className="flex flex-wrap gap-2">
               {sharedCats.map(cat => (
                  <span key={cat} className="text-[9px] font-black text-white/30 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest">
                     {cat}
                  </span>
               ))}
               <span className="text-[9px] font-black text-white/15 px-2.5 py-1 uppercase tracking-widest">
                  — patient-approved categories
               </span>
            </div>
         )}

         {/* Tab Bar */}
         <div className="flex border-b border-white/5 pb-0.5 gap-6 overflow-x-auto">
            {visibleTabs.map((tab) => {
               const Icon = tab.icon
               return (
                  <button
                     key={tab.key}
                     onClick={() => setActiveTab(tab.key)}
                     className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] pb-3 whitespace-nowrap transition-all relative shrink-0",
                        effectiveTab === tab.key ? "text-[#5B8DEF]" : "text-white/20 hover:text-white/40"
                     )}
                  >
                     <Icon className="w-3 h-3" />
                     {tab.label}
                     {effectiveTab === tab.key && (
                        <motion.div
                           layoutId="doctor-records-tab-indicator"
                           className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B8DEF] shadow-[0_0_10px_rgba(91,141,239,0.5)]"
                        />
                     )}
                  </button>
               )
            })}
         </div>

         {/* Content */}
         <div className="space-y-4">
            <AnimatePresence mode="wait">
               <motion.div
                  key={effectiveTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
               >
                  {renderContent()}
               </motion.div>
            </AnimatePresence>
         </div>

         {/* View-only footer watermark */}
         <div className="flex items-center justify-center gap-2 py-4 border-t border-white/5">
            <Lock className="w-3 h-3 text-white/10" />
            <p className="text-[9px] font-bold text-white/10 uppercase tracking-[0.3em]">
               Shared Clinical Data · Synchronized from MedVault
            </p>
         </div>
      </div>
   )
}



// Reusable card for a single read-only record
function ViewOnlyCard({ children, color, icon }: { children: React.ReactNode; color: string; icon: React.ReactNode }) {
   return (
      <div className="bg-[#111827]/40 border border-white/[0.04] p-5 rounded-3xl relative overflow-hidden select-none"
           onContextMenu={e => e.preventDefault()} // Disable right-click
      >
         <div className="flex items-start gap-3">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", ICON_COLORS[color])}>
               {icon}
            </div>
            <div className="flex-1 min-w-0">
               {children}
            </div>
         </div>
         {/* Subtle view-only corner indicator */}
         <div className="absolute top-3 right-3">
            <Eye className="w-3 h-3 text-white/10" />
         </div>
      </div>
   )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
   return (
      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
         <div className="flex justify-center mb-3">{icon}</div>
         <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{label}</p>
      </div>
   )
}
