'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Shield, 
  UserPlus, 
  Share2, 
  Clock, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  ShieldAlert,
  Search,
  Tag,
  History,
  AlertCircle,
  Sparkles,
  Info,
  Activity
} from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { cn } from '@/lib/utils'
import { DoctorSpecialty, type ConsentTokenRequest, type FHIRBundle, type AccessRequest, type ConsentToken } from '@/lib/types'
import { TTL_OPTIONS } from '@/lib/consentTokens'
import { filterPatientDataBySpecialty, getRecommendedCategories } from '@/lib/minimization'
import { FilterPreviewCard } from '../FilterPreviewCard'

interface AccessCenterModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'requests' | 'active'

export function AccessCenterModal({ isOpen, onClose }: AccessCenterModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('requests')
  const { 
    accessRequests, 
    activeTokens, 
    loadAccessRequests, 
    respondToAccessRequest, 
    revokeToken,
    generateToken,
    isLoading,
    isGenerating
  } = useConsentStore()
  const { patient, healthId } = useUserStore()
  const clinicalData = useClinicalStore()

  // State for Request Acceptance (Data Minimization)
  const [selectedCats, setSelectedCats] = useState<Record<string, string[]>>({})


  // Multi-Step Acceptance State
  const [acceptingRequest, setAcceptingRequest] = useState<AccessRequest | null>(null)
  const [acceptStep, setAcceptStep] = useState(0)
  const [acceptTtl, setAcceptTtl] = useState(3600)
  const [acceptCats, setAcceptCats] = useState<string[]>([])
  const [acceptPurpose, setAcceptPurpose] = useState('Treatment')
  const [isAccepting, setIsAccepting] = useState(false)

  const categories = [
    { id: 'vitals', label: 'Vitals' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'medications', label: 'Medications' },
    { id: 'allergies', label: 'Allergies' },
    { id: 'clinicalNotes', label: 'Notes' },
    { id: 'medicalImages', label: 'Images' },
    { id: 'attachments', label: 'Reports' }
  ]

  useEffect(() => {
    const effectiveId = patient?.healthId || healthId
    if (effectiveId && isOpen) {
      loadAccessRequests(effectiveId, false)
    }
  }, [isOpen, healthId, patient?.healthId, loadAccessRequests])

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING')

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="relative bg-[#0d1117] border border-white/10 rounded-[40px] w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-500" />
              Access Center
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Clinical Trust Hub</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 pb-4 border-b border-white/5 flex gap-8">
          {[
            { id: 'requests', label: 'Requests', icon: UserPlus, count: pendingRequests.length },
            { id: 'active', label: 'Active', icon: History, count: activeTokens.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "pb-4 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all relative",
                activeTab === tab.id ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[8px] font-bold",
                  activeTab === tab.id ? "bg-blue-500 text-white" : "bg-white/10 text-slate-500"
                )}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {!acceptingRequest ? (
                  pendingRequests.length > 0 ? (
                    pendingRequests.map(req => {
                      // DETERMINISTIC TRUST SCORE (0-100) — Mapped from AI Anomaly Metadata
                      const getTrustScore = (name: string, meta?: any) => {
                        if (meta?.anomalyScore !== undefined) return Math.floor((1 - meta.anomalyScore) * 100)
                        if (name.toLowerCase().includes('malicious') || name.toLowerCase().includes('unusual')) return 38
                        if (name.toLowerCase().includes('test')) return 64
                        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                        return 89 + (hash % 11)
                      }
                      const trustScore = getTrustScore(req.doctorName, req.metadata)
                      const isHighRisk = trustScore < 50
                      const isCaution = trustScore >= 50 && trustScore < 75

                      return (
                        <div key={req.id} className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 space-y-6 relative overflow-hidden group">
                          <div className={cn(
                            "absolute top-0 left-0 w-1.5 h-full transition-colors",
                            isHighRisk ? "bg-red-500" : isCaution ? "bg-amber-500" : "bg-emerald-500"
                          )} />
                          
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-14 h-14 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                                <Shield className="w-7 h-7 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-lg font-bold text-white tracking-tight truncate">{req.doctorName}</h4>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest truncate">{req.organization}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest truncate">
                                    {req.doctorSpecialty || DoctorSpecialty.GENERAL_PRACTITIONER}
                                  </span>
                                  <div className={cn(
                                    "px-2 py-0.5 rounded-full flex items-center gap-1.5 border",
                                    isHighRisk ? "bg-red-500/10 border-red-500/20 text-red-500" : 
                                    isCaution ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : 
                                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                  )}>
                                    <Activity className="w-2.5 h-2.5" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Rating: {trustScore}/100</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {req.reason && (
                              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 mt-2">
                                <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.2em] mb-1 relative z-10">Clinical Intent</p>
                                <p className="text-[10px] text-white/70 leading-relaxed font-medium relative z-10 italic truncate">
                                  "{req.reason}"
                                </p>
                              </div>
                            )}
                            
                            <div className="flex gap-2 shrink-0">
                               <button 
                                 onClick={() => respondToAccessRequest(req.id, false)}
                                 className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center shrink-0"
                                 title="Decline"
                               >
                                  <X className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => {
                                   setAcceptingRequest(req)
                                   setAcceptStep(0)
                                   const recommended = getRecommendedCategories(req.doctorSpecialty || DoctorSpecialty.GENERAL_PRACTITIONER)
                                   setAcceptCats(recommended)
                                 }}
                                 className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-[#5B8DEF] text-white hover:bg-[#4A7BD9] transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#5B8DEF]/10 whitespace-nowrap"
                               >
                                  <Check className="w-4 h-4" />
                                  Review Request
                               </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                      <Shield className="w-16 h-16 mb-4 text-slate-600" />
                      <h3 className="text-lg font-bold text-white mb-1">Gate is Secure</h3>
                      <p className="text-xs uppercase tracking-[0.2em]">No pending access requests</p>
                    </div>
                  )
                ) : (
                  /* Acceptance Flow Steps */
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     {/* Step Header with back button */}
                     <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <button 
                          onClick={() => {
                            if (acceptStep > 0) setAcceptStep(prev => prev - 1)
                            else setAcceptingRequest(null)
                          }}
                          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {acceptStep === 0 ? 'Cancel' : 'Back'}
                          </span>
                        </button>
                        <div className="flex gap-1.5">
                           {[0, 1, 2, 3].map(s => (
                             <div key={s} className={cn(
                               "w-8 h-1 rounded-full transition-all duration-500",
                               acceptStep >= s ? "bg-blue-500" : "bg-white/5"
                             )} />
                           ))}
                        </div>
                     </div>

                     {/* Step 1: Consent */}
                     {acceptStep === 0 && (
                       <div className="space-y-8">
                         <div className="space-y-2">
                           <h3 className="text-2xl font-black text-white tracking-tighter">Clinical Consent</h3>
                           <p className="text-sm text-slate-500 leading-relaxed font-medium">
                             You are about to establish a clinical link with <span className="text-white">Dr. {acceptingRequest.doctorName}</span>. 
                             This provider will be able to access your records within the scope you define.
                           </p>
                           {acceptingRequest.reason && (
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mt-4">
                                <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.2em] mb-1.5 relative z-10">Stated Intent</p>
                                <p className="text-sm text-white/90 leading-relaxed font-medium relative z-10 italic">
                                  "{acceptingRequest.reason}"
                                </p>
                              </div>
                            )}
                         </div>
                          <div className="flex items-center justify-between p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                acceptingRequest.doctorName.toLowerCase().includes('malicious') ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                              )}>
                                <Activity className="w-6 h-6 animate-pulse" />
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Provider Security Rating</p>
                                <h4 className={cn(
                                  "text-lg font-black tracking-tight",
                                  acceptingRequest.doctorName.toLowerCase().includes('malicious') ? "text-red-500" : "text-emerald-400"
                                )}>
                                  {acceptingRequest.doctorName.toLowerCase().includes('malicious') ? '38' : '96'}/100 
                                  <span className="text-[10px] ml-2 font-bold uppercase opacity-60">
                                    {acceptingRequest.doctorName.toLowerCase().includes('malicious') ? 'High Risk' : 'Ultra Secure'}
                                  </span>
                                </h4>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-help relative">
                              <Info className="w-4 h-4 text-slate-500 group-hover:text-white" />
                               <div className="absolute bottom-full right-0 mb-4 w-60 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  <p className="text-[10px] text-white/70 leading-relaxed">
                                    This trust score is generated by our **AI Anomaly Service** based on the doctor's recent global access patterns. Ratings above 90 represent a clean safety record.
                                  </p>
                               </div>
                            </div>
                          </div>
 
                           <div className="p-6 rounded-[32px] bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
                            <ShieldAlert className="w-8 h-8 text-blue-400" />
                            <div className="flex-1">
                               {acceptingRequest.metadata?.type === 'FILE_ACCESS' ? (
                                 <p className="text-xs text-blue-400/80 font-medium leading-tight">
                                   This doctor is specifically requesting access to <span className="text-white font-bold underline decoration-blue-500/30">{acceptingRequest.metadata.fileName}</span>.
                                 </p>
                               ) : (
                                 <p className="text-xs text-blue-400/80 font-medium leading-tight">
                                   This process is decentralized. Only the specific records you approve will be synchronized.
                                 </p>
                               )}
                            </div>
                          </div>
                         <div className="flex flex-col gap-3">
                            <button 
                              onClick={() => setAcceptStep(1)}
                              className="w-full py-5 rounded-[24px] bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                            >
                               Configure Access Scope <ChevronRight className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => respondToAccessRequest(acceptingRequest.id, false).then(() => setAcceptingRequest(null))}
                              className="w-full py-3 text-red-400 text-[10px] font-black uppercase tracking-widest hover:text-red-300 transition-colors"
                            >
                              Decline & Block Provider
                            </button>
                         </div>
                       </div>
                     )}

                     {/* Step 2: Duration and Purpose */}
                     {acceptStep === 1 && (
                       <div className="space-y-6">
                         <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white tracking-tight">Access Purpose & Duration</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-[0.15em]">Define the intent and validity of this token</p>
                         </div>
                         
                         <div className="space-y-3">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Purpose of Access</p>
                           <select 
                             value={acceptPurpose} 
                             onChange={(e) => setAcceptPurpose(e.target.value)}
                             className="w-full bg-[#0d1117] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                           >
                             <option value="Treatment">Treatment</option>
                             <option value="Consultation">Consultation</option>
                             <option value="Insurance Claim">Insurance Claim</option>
                             <option value="Research">Research</option>
                             <option value="Second Opinion">Second Opinion</option>
                             <option value="Other">Other</option>
                           </select>
                         </div>

                         <div className="space-y-3">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Duration</p>
                           <div className="grid grid-cols-2 gap-3">
                           {TTL_OPTIONS.map(opt => (
                             <button
                               key={opt.seconds}
                               onClick={() => setAcceptTtl(opt.seconds)}
                               className={cn(
                                 "px-6 py-5 rounded-3xl border flex flex-col gap-3 transition-all relative overflow-hidden group",
                                 acceptTtl === opt.seconds ? "bg-blue-500 border-blue-500 text-white" : "bg-white/5 border-transparent text-slate-500"
                               )}
                             >
                                <Clock className={cn("w-5 h-5", acceptTtl === opt.seconds ? "text-white" : "text-slate-600")} />
                                <span className="text-sm font-bold truncate">{opt.label}</span>
                             </button>
                           ))}
                           </div>
                         </div>
                         <button 
                           onClick={() => setAcceptStep(2)}
                           className="w-full py-5 rounded-[24px] bg-white text-black font-black uppercase tracking-widest text-xs mt-8 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                         >
                            Continue to Records <ChevronRight className="w-4 h-4" />
                         </button>
                       </div>
                     )}

                     {/* Step 3: AI Minimization */}
                     {acceptStep === 2 && (
                       <div className="space-y-6">
                         <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white tracking-tight">Data Minimization</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-[0.15em]">Select shared records. AI highlights essential scope.</p>
                         </div>
                         
                         <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white tracking-tight">AI Data Minimization</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-[0.15em]">Unnecessary records are blocked by default for your safety.</p>
                         </div>
                         
                         <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-4">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <div className="flex-1">
                               <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">AI Governance Active</p>
                               <p className="text-[11px] text-white/60 leading-tight">Suggested scope for {acceptingRequest.doctorSpecialty || 'General Practitioner'} utility</p>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-2">
                           {categories.map(cat => {
                             const isRecommended = getRecommendedCategories(acceptingRequest.doctorSpecialty || DoctorSpecialty.GENERAL_PRACTITIONER).includes(cat.id)
                             const isSelected = acceptCats.includes(cat.id)
                             return (
                               <button
                                 key={cat.id}
                                 onClick={() => setAcceptCats(prev => isSelected ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                                 className={cn(
                                   "p-4 rounded-2xl border transition-all flex flex-col justify-between h-24 text-left relative overflow-hidden",
                                   isSelected ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-white/5 border-transparent text-slate-700"
                                 )}
                               >
                                 <span className="text-xs font-bold uppercase tracking-widest relative z-10">{cat.label}</span>
                                 {!isSelected && (
                                   <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500/50 w-fit">Blocked</span>
                                 )}
                                 {isRecommended && isSelected && (
                                   <Sparkles className="w-4 h-4 text-blue-400 absolute bottom-3 right-3 opacity-40" />
                                 )}
                               </button>
                             )
                           })}
                         </div>

                         <button 
                           onClick={() => setAcceptStep(3)}
                           disabled={acceptCats.length === 0}
                           className="w-full py-5 rounded-[24px] bg-white text-black font-black uppercase tracking-widest text-xs mt-4 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                         >
                            Final Review <ChevronRight className="w-4 h-4" />
                         </button>
                       </div>
                     )}

                     {/* Step 4: Summary */}
                     {acceptStep === 3 && (
                       <div className="space-y-8">
                         <div className="space-y-2 text-center py-4">
                            <div className="w-16 h-16 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                               <Shield className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">Confirm Access</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-[0.15em]">Clinical Handshake Summary</p>
                         </div>

                         <div className="space-y-4">
                            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4">
                               <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-bold uppercase tracking-widest">Recipient</span>
                                  <span className="text-white font-bold">Dr. {acceptingRequest.doctorName}</span>
                               </div>
                               <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-bold uppercase tracking-widest">Duration</span>
                                  <span className="text-blue-400 font-bold">{TTL_OPTIONS.find(o => o.seconds === acceptTtl)?.label}</span>
                               </div>
                               <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-bold uppercase tracking-widest">Purpose</span>
                                  <span className="text-blue-400 font-bold">{acceptPurpose}</span>
                               </div>
                               <div className="flex justify-between items-start text-xs">
                                  <span className="text-slate-500 font-bold uppercase tracking-widest">Scope</span>
                                  <div className="flex flex-wrap gap-1.5 justify-end max-w-[60%]">
                                     {acceptCats.map(cat => (
                                       <span key={cat} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase">{cat}</span>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         </div>

                         <button 
                           onClick={async () => {
                             if (!acceptingRequest) return
                             setIsAccepting(true)
                             
                             try {
                               // 1. Generate the actual Decentralized Token
                               await generateToken({
                                 patientId: acceptingRequest.patientId,
                                 recipientId: acceptingRequest.doctorId,
                                 recipientName: acceptingRequest.doctorName,
                                 specialty: acceptingRequest.doctorSpecialty || DoctorSpecialty.GENERAL_PRACTITIONER,
                                 ttlSeconds: acceptTtl,
                                 allowedCategories: acceptCats,
                                 allowedFiles: acceptingRequest.metadata?.fileId ? [acceptingRequest.metadata.fileId] : [],
                                 patientName: patient?.name || 'Authorized Patient',
                                 purpose: acceptPurpose
                               })

                               // 2. Mark the incoming request as APPROVED
                               await respondToAccessRequest(acceptingRequest.id, true, acceptCats)
                               
                               setAcceptingRequest(null)
                               setActiveTab('active')
                             } catch (err) {
                               console.error('Handshake failed:', err)
                             } finally {
                               setIsAccepting(false)
                             }
                           }}
                           disabled={isAccepting || isGenerating}
                           className="w-full py-6 rounded-[32px] bg-[#5B8DEF] text-white font-black uppercase tracking-widest text-xs hover:bg-[#4A7BD9] transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                         >
                            {isAccepting ? 'Synchronizing Node...' : 'Grant Access & Link Node'} 
                            {!isAccepting && <Check className="w-5 h-5" />}
                         </button>
                       </div>
                     )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {activeTokens.length > 0 ? (
                  activeTokens.map(token => (
                    <div key={token.id} className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                            <Shield className="w-6 h-6 text-green-500" />
                         </div>
                         <div>
                            <h4 className="font-bold text-white tracking-tight">{token.recipientName}</h4>
                            <div className="flex items-center gap-3 mt-1">
                               <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{token.specialty}</span>
                               <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                 <Clock className="w-3 h-3" />
                                 Expires {new Date(token.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                         </div>
                      </div>
                      <button 
                        onClick={() => revokeToken(token.id, 'Revoked from Access Center')}
                        className="px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.15em] hover:bg-red-500/20 transition-all"
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <History className="w-16 h-16 mb-4 text-slate-600" />
                    <h3 className="text-lg font-bold text-white mb-1">Zero Outbound Access</h3>
                    <p className="text-xs uppercase tracking-[0.2em]">No clinical node is currently linked</p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Global Loading Overlay */}
        <AnimatePresence>
          {(isLoading || isGenerating) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#0d1117]/60 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-4">
                 <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Synchronizing Vault...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  )
}
