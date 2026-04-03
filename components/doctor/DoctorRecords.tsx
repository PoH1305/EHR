'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
  Download,
  Lock,
  Eye
} from 'lucide-react'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { FileTypeBadge } from '@/components/FileTypeBadge'
import { supabase } from '@/lib/supabase'

interface DoctorRecordsProps {
   patientId?: string | null
}

interface Permission {
  record_id: string
  permission_type: string
  is_revoked: boolean
  expires_at: string
}

const VIEW_ONLY_CATEGORIES = [
  { key: 'attachments', label: 'Records', icon: FileText, color: 'purple' },
  { key: 'vitals', label: 'Vitals', icon: Activity, color: 'blue' },
  { key: 'medications', label: 'Medications', icon: Pill, color: 'emerald' },
  { key: 'conditions', label: 'Conditions', icon: ClipboardList, color: 'amber' },
  { key: 'allergies', label: 'Allergies', icon: AlertCircle, color: 'rose' },
  { key: 'clinicalNotes', label: 'Notes', icon: Edit3, color: 'indigo' },
]

export default function DoctorRecords({ patientId }: DoctorRecordsProps) {
   const [activeTab, setActiveTab] = useState('attachments')
   const [permissions, setPermissions] = useState<Permission[]>([])
   const [isPermissionsLoading, setIsPermissionsLoading] = useState(true)

   const {
      vitals,
      conditions,
      medications,
      allergies,
      clinicalNotes,
      attachments,
      selectedPatientProfile,
      isLoading: isClinicalStoreLoading,
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

   // 2. Fetch and Subscribe to Permissions
   useEffect(() => {
      if (!firebaseUid || !patientId) return

      const fetchPermissions = async () => {
         const { data, error } = await supabase
            .from('record_access_permissions')
            .select('record_id, permission_type, is_revoked, expires_at')
            .eq('doctor_id', firebaseUid)
            .eq('patient_id', patientId)
         
         if (!error && data) {
            setPermissions(data)
         }
         setIsPermissionsLoading(false)
      }

      void fetchPermissions()

      // Real-time subscription for revocations/expiries
      const channel = supabase
         .channel('permissions_updates')
         .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'record_access_permissions',
            filter: `doctor_id=eq.${firebaseUid}`
         }, (payload) => {
            if (payload.eventType === 'INSERT') {
               setPermissions(prev => [...prev, payload.new as Permission])
            } else if (payload.eventType === 'UPDATE') {
               setPermissions(prev => prev.map(p => 
                  (p.record_id === payload.new.record_id && p.permission_type === payload.new.permission_type) 
                  ? payload.new as Permission 
                  : p
               ))
            } else if (payload.eventType === 'DELETE') {
               setPermissions(prev => prev.filter(p => p.record_id !== payload.old.record_id))
            }
         })
         .subscribe()

      return () => {
         void supabase.removeChannel(channel)
      }
   }, [firebaseUid, patientId])

   const hasPermission = (recordId: string, type: 'view' | 'download') => {
      const perm = permissions.find(p => p.record_id === recordId && p.permission_type === type)
      if (!perm) return false
      if (perm.is_revoked) return false
      if (new Date(perm.expires_at) <= new Date()) return false
      return true
   }

   const handleAction = async (recordId: string, type: 'view' | 'download', filename: string, isOwner?: boolean) => {
      // Permission bypass if the doctor is the original uploader
      if (!isOwner && !hasPermission(recordId, type)) {
         alert(`Access Denied: You do not have active ${type} permissions for this record.`)
         return
      }

      // Build the endpoint using the robust catch-all API
      // Since recordId might be a path like "patientId/fileId", we split and re-encode to be double-safe
      // Next.js catch-all "[[...recordId]]" will decode segments automatically.
      const encodedPath = recordId.split('/').map(encodeURIComponent).join('/')
      const endpoint = `/api/records/${type}/${encodedPath}?userId=${firebaseUid}`
      
      try {
         if (patientId && firebaseUid) {
            void addAuditEvent({
               id: crypto.randomUUID(),
               type: type === 'view' ? 'RECORD_VIEWED' : 'EXPORT_DATA',
               timestamp: new Date().toISOString(),
               userId: firebaseUid,
               description: `Doctor ${type}ed record: ${filename}`,
               metadata: { filename, type, doctorId: firebaseUid }
            }, patientId)
         }

         if (type === 'view') {
            window.open(endpoint, '_blank')
         } else {
            // Trigger download
            const a = document.createElement('a')
            a.href = endpoint
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
         }
      } catch (err) {
         console.error(`${type} failed:`, err)
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

    // Filter attachments based on real-time permissions
    const filteredAttachments = attachments.filter(att => {
       const recordId = att.storagePath || att.id
       // Safety: If the doctor is the uploader, allow view (fallback if permissions sync is slow)
       const isUploader = att.doctorId === firebaseUid
       return isUploader || hasPermission(recordId, 'view') || hasPermission(recordId, 'download')
    })

    const handleRestoreAccess = async () => {
       if (!firebaseUid || !patientId || !approvedRequest) return
       
       setIsPermissionsLoading(true)
       try {
          const expiresAt = approvedRequest.metadata?.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          
          const reports = attachments || []
          if (reports.length > 0) {
             const permissions = reports.flatMap(report => [
                {
                   record_id: report.storagePath || report.id,
                   patient_id: patientId,
                   doctor_id: firebaseUid,
                   permission_type: 'view',
                   expires_at: expiresAt,
                   is_revoked: false
                },
                {
                   record_id: report.storagePath || report.id,
                   patient_id: patientId,
                   doctor_id: firebaseUid,
                   permission_type: 'download',
                   expires_at: expiresAt,
                   is_revoked: false
                }
             ])

             const { error: permError } = await supabase
                .from('record_access_permissions')
                .upsert(permissions, { onConflict: 'doctor_id,patient_id,record_id,permission_type' })
                
             if (permError) throw permError
             
             // Refresh local permissions state
             const { data } = await supabase
                .from('record_access_permissions')
                .select('record_id, permission_type, is_revoked, expires_at')
                .eq('doctor_id', firebaseUid)
                .eq('patient_id', patientId)
             
             if (data) setPermissions(data)
             alert('Access restored! You can now view all shared records.')
          }
       } catch (err) {
          console.error('Failed to restore access:', err)
          alert('Failed to restore access. Please ask the patient to re-grant permission.')
       } finally {
          setIsPermissionsLoading(false)
       }
    }

   const renderContent = () => {
      switch (activeTab) {
         case 'attachments':
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredAttachments.length > 0 ? filteredAttachments.map((att: any, i) => {
                      const recordId = att.storagePath || att.id
                      const canView = att.doctorId === firebaseUid || hasPermission(recordId, 'view')
                      const canDownload = att.doctorId === firebaseUid || hasPermission(recordId, 'download')

                      return (
                      <div key={att.id || i} className="bg-white/5 border border-white/10 p-5 rounded-[32px] group hover:bg-white/[0.08] transition-all relative overflow-hidden">
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
                            
                            <div className="flex gap-2 shrink-0">
                               <button 
                                  onClick={() => handleAction(att.storagePath || att.id, 'view', att.fileName, att.doctorId === firebaseUid)}
                                  disabled={!canView}
                                  className={cn(
                                    "p-2.5 rounded-xl border transition-all",
                                    canView 
                                      ? "border-[#5B8DEF]/20 bg-[#5B8DEF]/10 text-[#5B8DEF] hover:bg-[#5B8DEF]/20" 
                                      : "border-white/5 bg-white/5 text-white/10 cursor-not-allowed"
                                  )}
                                  title={canView ? "View Record" : "View Access Restricted"}
                               >
                                  {canView ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                               </button>
                               <button 
                                  onClick={() => handleAction(att.storagePath || att.id, 'download', att.fileName, att.doctorId === firebaseUid)}
                                  disabled={!canDownload}
                                  className={cn(
                                    "p-2.5 rounded-xl border transition-all",
                                    canDownload 
                                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                      : "border-white/5 bg-white/5 text-white/10 cursor-not-allowed"
                                  )}
                                  title={canDownload ? "Download Record" : "Download Access Restricted"}
                               >
                                  {canDownload ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                               </button>
                            </div>
                         </div>
                         <div className="mt-4 flex items-center justify-between">
                            <p className="text-[9px] text-white/15 font-bold uppercase tracking-widest">
                               Uploaded {new Date(att.uploadedAt).toLocaleDateString()}
                            </p>
                         </div>
                      </div>
                   )}) : (
                      <div className="col-span-full">
                         <EmptyState 
                            icon={<FlaskConical className="w-8 h-8 text-white/10" />} 
                            label="No clinical records available for this patient" 
                         />
                         {approvedRequest && (
                            <div className="mt-8 flex flex-col items-center">
                               <p className="text-[10px] text-white/40 mb-4 max-w-xs text-center uppercase tracking-widest font-bold leading-relaxed">
                                  You have an approved clinical link, but record-level permissions may be pending synchronization.
                                </p>
                               <button 
                                  onClick={handleRestoreAccess}
                                  className="px-6 py-3 rounded-2xl bg-[#5B8DEF]/10 border border-[#5B8DEF]/20 text-[#5B8DEF] text-[10px] font-black uppercase tracking-widest hover:bg-[#5B8DEF]/20 transition-all flex items-center gap-2"
                               >
                                  <ShieldCheck className="w-4 h-4" />
                                  Restore Patient Files Visibility
                               </button>
                            </div>
                         )}
                      </div>
                   )}
                </div>
            )
         case 'vitals':
            return (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vitals.length > 0 ? vitals.map((v, i) => (
                     <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[32px]">
                        <p className="text-[10px] uppercase font-bold text-white/20 tracking-widest mb-2">{v.type}</p>
                        <div className="flex items-baseline gap-2">
                           <span className="text-3xl font-black text-white tracking-tighter">{v.latestValue}</span>
                           <span className="text-xs font-bold text-white/40">{v.unit}</span>
                        </div>
                        <p className="text-[9px] text-white/10 mt-4 uppercase tracking-widest font-bold">Recorded {v.readings?.[0]?.timestamp ? new Date(v.readings[0].timestamp).toLocaleString() : 'Recent'}</p>
                     </div>
                  )) : <div className="col-span-full"><EmptyState icon={<Activity className="w-8 h-8 text-white/10" />} label="No vitals recorded" /></div>}
               </div>
            )
         case 'medications':
            return (
               <div className="space-y-4">
                  {medications.length > 0 ? medications.map((m, i) => (
                     <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                              <Pill className="w-5 h-5 text-emerald-500" />
                           </div>
                           <div>
                              <p className="font-bold text-white">{(m as any).medicationCodeableConcept?.text || 'Medication'}</p>
                              <p className="text-xs text-white/40">{(m as any).dosageInstruction?.[0]?.text || 'No dosage info'}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">{m.status}</span>
                        </div>
                     </div>
                  )) : <EmptyState icon={<Pill className="w-8 h-8 text-white/10" />} label="No medications found" />}
               </div>
            )
         case 'conditions':
            return (
               <div className="space-y-4">
                  {conditions.length > 0 ? conditions.map((c, i) => (
                     <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-amber-500" />
                           </div>
                           <div>
                              <p className="font-bold text-white">{c.code?.text || 'Condition'}</p>
                              <p className="text-xs text-white/40 text-capitalize">{(c as any).clinicalStatus || 'Unknown status'}</p>
                           </div>
                        </div>
                     </div>
                  )) : <EmptyState icon={<ClipboardList className="w-8 h-8 text-white/10" />} label="No clinical conditions on file" />}
               </div>
            )
         case 'allergies':
            return (
               <div className="space-y-4">
                  {allergies.length > 0 ? allergies.map((a, i) => (
                     <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-[32px] flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                           <AlertCircle className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                           <p className="font-bold text-white">{a.code?.text || 'Allergy'}</p>
                           <p className="text-xs text-rose-500/60 font-medium uppercase tracking-widest">{a.criticality || 'Normal'} Priority</p>
                        </div>
                     </div>
                  )) : <EmptyState icon={<AlertCircle className="w-8 h-8 text-white/10" />} label="No allergies recorded" />}
               </div>
            )
         case 'clinicalNotes':
            return (
               <div className="space-y-6">
                  {clinicalNotes.length > 0 ? clinicalNotes.map((n, i) => (
                     <div key={i} className="bg-[#111827]/40 border border-white/[0.05] p-8 rounded-[40px]">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                              <Edit3 className="w-5 h-5 text-white/40" />
                           </div>
                           <div>
                              <p className="text-sm font-medium text-white/80 leading-relaxed italic">&quot;{n.content}&quot;</p>
                              <div className="mt-4 flex items-center gap-3">
                                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                    {n.doctorName} · {new Date(n.timestamp).toLocaleDateString()}
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>
                  )) : <EmptyState icon={<Edit3 className="w-8 h-8 text-white/10" />} label="No clinical notes found" />}
               </div>
            )
         default:
            return <div className="space-y-4"></div>
      }
   }

   const isLoading = isClinicalStoreLoading || isPermissionsLoading

   if (isLoading) {
      return (
         <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 text-[#5B8DEF] animate-spin" />
            <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">Synchronizing Secure Flux</p>
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
                     Clinical Records • Secure Controlled Access
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
               <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Permission Guarded</span>
            </div>
         </div>

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
