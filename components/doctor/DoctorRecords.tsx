'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  Loader2, 
  FileText, 
  Pill, 
  Activity,
  AlertCircle,
  ClipboardList,
  Edit3,
  ShieldCheck,
  FlaskConical,
  Paperclip,
  BadgeCheck,
  ChevronRight
} from 'lucide-react'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { FileTypeBadge } from '@/components/FileTypeBadge'

interface DoctorRecordsProps {
   patientId?: string | null
}

const VIEW_ONLY_CATEGORIES = [
  { key: 'attachments', label: 'Records', icon: FileText, color: 'purple' },
  { key: 'vitals', label: 'Vitals', icon: Activity, color: 'blue' },
  { key: 'medications', label: 'Medications', icon: Pill, color: 'emerald' },
  { key: 'conditions', label: 'Conditions', icon: ClipboardList, color: 'amber' },
  { key: 'allergies', label: 'Allergies', icon: AlertCircle, color: 'rose' },
  { key: 'clinicalNotes', label: 'Notes', icon: Edit3, color: 'indigo' },
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
   const [activeTab, setActiveTab] = useState('attachments')

   const {
      vitals,
      conditions,
      medications,
      allergies,
      clinicalNotes,
      attachments,
      selectedPatientProfile,
      isLoading,
      addAuditEvent
   } = useClinicalStore()

   const { accessRequests } = useConsentStore()
   const { firebaseUid, firebaseEmail } = useUserStore()

   // 1. Initial Access Log
   useEffect(() => {
      if (patientId && firebaseUid) {
         void addAuditEvent({
            id: crypto.randomUUID(),
            type: 'ACCESS',
            timestamp: new Date().toISOString(),
            userId: firebaseUid,
            description: `Doctor (${firebaseEmail || 'Unknown'}) accessed your clinical records dashboard.`,
            metadata: { doctorId: firebaseUid, patientId }
         }, patientId)
      }
   }, [patientId, firebaseUid, firebaseEmail, addAuditEvent])

   // 2. Tab Switch Log
   useEffect(() => {
      if (patientId && firebaseUid && activeTab) {
         void addAuditEvent({
            id: crypto.randomUUID(),
            type: 'RECORD_VIEWED',
            timestamp: new Date().toISOString(),
            userId: firebaseUid,
            description: `Doctor viewed your ${activeTab} history.`,
            metadata: { category: activeTab, doctorId: firebaseUid }
         }, patientId)
      }
   }, [activeTab, patientId, firebaseUid, addAuditEvent])

   const handleDownload = async (fileUrl: string, filename: string) => {
      try {
         if (patientId && firebaseUid) {
            void addAuditEvent({
               id: crypto.randomUUID(),
               type: 'EXPORT_DATA',
               timestamp: new Date().toISOString(),
               userId: firebaseUid,
               description: `Doctor downloaded record: ${filename}`,
               metadata: { filename, fileUrl, doctorId: firebaseUid }
            }, patientId)
         }
         window.open(fileUrl, '_blank')
      } catch (err) {
         console.error('Download failed:', err)
      }
   }

   const approvedRequest = accessRequests.find(r => 
      r.patientId === patientId && r.status === 'APPROVED'
   )
   const sharedCats: string[] = approvedRequest?.sharedCategories || []

   // Only show tabs for categories that were approved
   const visibleTabs = VIEW_ONLY_CATEGORIES.filter(cat => 
      sharedCats.length === 0 || sharedCats.includes(cat.key)
   )

   const renderContent = () => {
      switch (activeTab) {
         case 'vitals':
            return (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vitals.map((v) => (
                    <div key={v.type} className="bg-white/5 border border-white/10 p-6 rounded-[32px] group hover:bg-white/[0.08] transition-all">
                       <p className="text-[10px] uppercase font-bold text-white/20 tracking-widest mb-2">{v.type}</p>
                       <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white tracking-tighter">{v.latestValue}</span>
                          <span className="text-xs font-bold text-white/20">{v.unit}</span>
                       </div>
                    </div>
                  ))}
                  {vitals.length === 0 && <EmptyState icon={<Activity className="w-8 h-8 text-white/10" />} label="No vitals shared" />}
               </div>
            )
         case 'medications':
            return (
               <div className="space-y-3">
                  {medications.map((m: any) => (
                    <div key={m.id} className="bg-white/5 border border-white/10 p-5 rounded-[28px] flex items-center gap-4 group hover:bg-white/[0.08] transition-all">
                       <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Pill className="w-5 h-5 text-emerald-500" />
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-bold text-white">{m.medicationCodeableConcept?.text || 'Unknown Medication'}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{m.dosageInstruction?.[0]?.text || 'As directed'}</p>
                       </div>
                       <div className="px-2.5 py-1 rounded-md bg-white/5 text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                          {m.status}
                       </div>
                    </div>
                  ))}
                  {medications.length === 0 && <EmptyState icon={<Pill className="w-8 h-8 text-white/10" />} label="No medications shared" />}
               </div>
            )
         case 'attachments':
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {attachments.length > 0 ? attachments.map((att: any, i) => (
                      <div key={att.id || i} className="bg-white/5 border border-white/10 p-5 rounded-[32px] group hover:bg-white/[0.08] transition-all">
                         <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                  <p className="font-bold text-white text-sm truncate">{att.fileName}</p>
                                  {att.isVerified && (
                                     <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#5B8DEF]/10 border border-[#5B8DEF]/20 shrink-0">
                                        <BadgeCheck className="w-3 h-3 text-[#5B8DEF]" />
                                        <span className="text-[8px] font-black text-[#5B8DEF] uppercase tracking-widest">Verified</span>
                                     </div>
                                  )}
                               </div>
                               <div className="flex items-center gap-2 mt-1">
                                  <FileTypeBadge fileName={att.fileName} mimeType={att.fileType ?? undefined} />
                                  <span className="text-[10px] text-white/30 uppercase tracking-widest">
                                     {att.category?.replace('_', ' ')} {att.fileSize > 0 ? `· ${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                                  </span>
                               </div>
                            </div>
                            <button 
                               onClick={() => handleDownload(att.fileUrl, att.fileName)}
                               className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#5B8DEF]/20 bg-[#5B8DEF]/10 hover:bg-[#5B8DEF]/20 shrink-0 transition-colors"
                            >
                               <Activity className="w-3 h-3 text-[#5B8DEF]" />
                               <span className="text-[9px] font-black text-[#5B8DEF] uppercase tracking-widest">Open</span>
                            </button>
                         </div>
                         <p className="text-[9px] text-white/15 mt-3 font-bold uppercase tracking-widest">
                            Uploaded {new Date(att.uploadedAt).toLocaleDateString()}
                         </p>
                      </div>
                   )) : (
                     <div className="col-span-full">
                        <EmptyState icon={<FlaskConical className="w-8 h-8 text-white/10" />} label="No documents shared" />
                     </div>
                   )}
                </div>
            )
         case 'conditions':
            return (
               <div className="space-y-3">
                  {conditions.map((c: any) => (
                    <div key={c.id} className="bg-white/5 border border-white/10 p-5 rounded-[28px] flex items-center gap-4 group hover:bg-white/[0.08] transition-all">
                       <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-amber-500" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white">{c.code?.text || 'Unknown Condition'}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{c.clinicalStatus || 'Active'}</p>
                       </div>
                    </div>
                  ))}
                  {conditions.length === 0 && <EmptyState icon={<ClipboardList className="w-8 h-8 text-white/10" />} label="No conditions shared" />}
               </div>
            )
         case 'allergies':
            return (
               <div className="space-y-3">
                  {allergies.map((a: any) => (
                    <div key={a.id} className="bg-red-500/10 border border-red-500/20 p-5 rounded-[28px] flex items-center gap-4 group hover:bg-white/[0.08] transition-all">
                       <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white">{a.code?.text || 'Unknown Allergy'}</p>
                          <p className="text-[10px] text-red-500/60 uppercase tracking-widest font-bold">{a.criticality || 'Normal'}</p>
                       </div>
                    </div>
                  ))}
                  {allergies.length === 0 && <EmptyState icon={<AlertCircle className="w-8 h-8 text-white/10" />} label="No allergies shared" />}
               </div>
            )
         case 'clinicalNotes':
            return (
               <div className="space-y-4">
                  {clinicalNotes.map((n) => (
                    <div key={n.id} className="bg-white/5 border border-white/10 p-6 rounded-[32px] group hover:bg-white/[0.08] transition-all">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                <Edit3 className="w-4 h-4 text-indigo-500" />
                             </div>
                             <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{n.doctorName}</span>
                          </div>
                          <span className="text-[9px] text-white/20 font-mono">{new Date(n.timestamp).toLocaleDateString()}</span>
                       </div>
                       <p className="text-sm text-white/70 leading-relaxed italic">&quot;{n.content}&quot;</p>
                    </div>
                  ))}
                  {clinicalNotes.length === 0 && <EmptyState icon={<Edit3 className="w-8 h-8 text-white/10" />} label="No notes shared" />}
               </div>
            )
         default:
            return <EmptyState icon={<FlaskConical className="w-8 h-8 text-white/10" />} label="No data available" />
      }
   }

   if (isLoading) {
      return (
         <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 text-[#5B8DEF] animate-spin" />
            <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">Synchronizing Clinical Flux</p>
         </div>
      )
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
         <div className="flex border-b border-white/5 pb-0.5 gap-6 overflow-x-auto no-scrollbar">
            {visibleTabs.map((tab) => {
               const Icon = tab.icon
               return (
                  <button
                     key={tab.key}
                     onClick={() => setActiveTab(tab.key)}
                     className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] pb-3 whitespace-nowrap transition-all relative shrink-0",
                        activeTab === tab.key ? "text-[#5B8DEF]" : "text-white/20 hover:text-white/40"
                     )}
                  >
                     <Icon className="w-3 h-3" />
                     {tab.label}
                     {activeTab === tab.key && (
                        <motion.div 
                           layoutId="activeTabDoctor"
                           className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B8DEF]"
                           initial={false}
                        />
                     )}
                  </button>
               )
            })}
         </div>

         {/* Tab Content */}
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderContent()}
         </div>
      </div>
   )
}

function EmptyState({ icon, label }: { icon: React.ReactNode, label: string }) {
   return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
         <div className="mb-4 text-white/10">
            {icon}
         </div>
         <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{label}</p>
      </div>
   )
}
