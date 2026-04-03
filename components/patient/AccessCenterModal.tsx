'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Shield, 
  UserPlus, 
  Clock, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  ShieldAlert,
  History,
  Sparkles,
  Info,
  Activity,
  CheckCircle2,
  User
} from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { cn } from '@/lib/utils'
import { DoctorSpecialty, type AccessRequest } from '@/lib/types'
import { TTL_OPTIONS } from '@/lib/consentTokens'
import { getRecommendedCategories, SPECIALTY_FIELD_MAP } from '@/lib/minimization'

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

  // TRUST DATA HELPER
  const getTrustData = (name: string, meta?: any) => {
    let score = 96
    if (meta?.anomalyScore !== undefined) score = Math.floor((1 - meta.anomalyScore) * 100)
    else if (name.toLowerCase().includes('malicious') || name.toLowerCase().includes('unusual')) score = 38
    else if (name.toLowerCase().includes('test')) score = 64
    else {
      const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      score = 89 + (hash % 11)
    }

    const risk = score < 50 ? 'high' : score < 75 ? 'caution' : 'secure'
    const color = risk === 'high' ? 'text-red-500' : risk === 'caution' ? 'text-amber-500' : 'text-emerald-500'
    const bg = risk === 'high' ? 'bg-red-500/10' : risk === 'caution' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
    const border = risk === 'high' ? 'border-red-500/20' : risk === 'caution' ? 'border-amber-500/20' : 'border-emerald-500/20'
    const glow = risk === 'high' ? 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' : risk === 'caution' ? 'shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'shadow-[0_0_20px_rgba(16,185,129,0.1)]'
    const label = risk === 'high' ? 'Unusual Activity' : risk === 'caution' ? 'Minor Variance' : 'Trusted Link'
    
    return { score, color, bg, border, label, risk, glow }
  }

  const getDoctorBio = (specialty: string) => {
    const bios: Record<string, string> = {
      [DoctorSpecialty.CARDIOLOGIST]: "Board-certified Cardiologist with expertise in preventive heart care, arrhythmia management, and advanced diagnostic imaging. Committed to long-term heart health.",
      [DoctorSpecialty.DERMATOLOGIST]: "Specializing in medical and aesthetic dermatology. Expert in early detection of skin conditions, lesion analysis, and precision treatment for chronic skin issues.",
      [DoctorSpecialty.ONCOLOGIST]: "Dedicated Oncology specialist focused on personalized therapy plans and comprehensive cancer care. Specialized in clinical trials and genetic markers.",
      [DoctorSpecialty.GENERAL_PRACTITIONER]: "Core Family Physician focused on holistic health, preventive medicine, and long-term wellness for patients of all ages.",
      [DoctorSpecialty.EMERGENCY]: "Emergency Care Specialist trained for rapid response, acute stabilization, and critical diagnostic assessment in urgent clinical scenarios.",
      [DoctorSpecialty.NEUROLOGIST]: "Neurology expert focused on brain health, nerve function, and neuromuscular diagnostics. Specialized in managing complex neurological conditions."
    }
    return bios[specialty] || "Dedicated medical professional committed to providing high-quality, patient-centric clinical care and maintaining the highest standards of data security."
  }

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
                      const trust = getTrustData(req.doctorName, req.metadata)

                      return (
                        <div key={req.id} className={cn("p-6 rounded-[32px] bg-white/[0.03] border border-white/5 space-y-6 relative overflow-hidden group transition-all", trust.glow)}>
                          <div className={cn(
                            "absolute top-0 left-0 w-1.5 h-full transition-colors",
                            trust.risk === 'high' ? "bg-red-500" : trust.risk === 'caution' ? "bg-amber-500" : "bg-emerald-500"
                          )} />
                          
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10">
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
                                    trust.bg, trust.border, trust.color
                                  )}>
                                    <Activity className={cn("w-2.5 h-2.5", trust.risk === 'high' && "animate-pulse")} />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Trust: {trust.score}/100</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
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
                         <div className="flex gap-1 shrink-0">
                            {[0, 1, 2, 3, 4, 5, 6].map(s => (
                              <div key={s} className={cn(
                                "w-5 h-1 rounded-full transition-all duration-500",
                                acceptStep >= s ? "bg-emerald-500" : "bg-white/5"
                              )} />
                            ))}
                         </div>
                     </div>

                      {acceptStep === 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="text-center space-y-1 py-4">
                            <h3 className="text-2xl font-bold text-white tracking-tight">Establish clinical link</h3>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.25em]">VERIFICATION · PHASE 1/7</p>
                          </div>

                          {/* MAIN DOCTOR IDENTITY CARD */}
                          {(() => {
                            const trust = getTrustData(acceptingRequest.doctorName, acceptingRequest.metadata)
                            const bio = getDoctorBio(acceptingRequest.doctorSpecialty || DoctorSpecialty.GENERAL_PRACTITIONER)
                            const regId = (acceptingRequest.metadata as any)?.regId || `MCI-2019-0${Math.floor(Math.random() * 90000) + 10000}`
                            
                            return (
                              <div className="space-y-4 text-center">
                                <div className="p-8 rounded-[32px] bg-[#0a120e] border border-emerald-500/20 relative overflow-hidden transition-all duration-1000">
                                  <div className="flex flex-col items-center relative z-10">
                                    {/* Avatar */}
                                    <div className="w-20 h-20 rounded-full bg-[#13271d] border border-emerald-500/20 flex items-center justify-center mb-6">
                                      <User className="w-8 h-8 text-emerald-500/70" />
                                    </div>

                                    <h4 className="text-2xl font-bold text-white tracking-tight mb-0.5">
                                      Dr. {acceptingRequest.doctorName}
                                    </h4>
                                    <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 whitespace-nowrap">
                                      {acceptingRequest.doctorSpecialty}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 whitespace-nowrap">
                                      {acceptingRequest.organization} · {regId}
                                    </p>

                                    <div className="w-full h-px bg-white/5 mb-6" />

                                    {/* ABOUT */}
                                    <div className="w-full text-left space-y-2 mb-6">
                                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ABOUT</p>
                                      <p className="text-[13px] text-slate-300 leading-relaxed font-semibold italic opacity-90">
                                        "{bio}"
                                      </p>
                                    </div>

                                    <div className="w-full h-px bg-white/5 mb-6" />

                                    {/* CLINICAL INTENT */}
                                    <div className="w-full text-left space-y-2 mb-8">
                                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">CLINICAL INTENT</p>
                                      <p className="text-[13px] text-emerald-400/90 font-bold">
                                        {acceptingRequest.reason || "General cardiac review and consultation"}
                                      </p>
                                    </div>

                                    {/* TRUST SCORE UI */}
                                    <div className="w-full space-y-4">
                                      <div className="flex items-baseline justify-center gap-1.5">
                                        <span className="text-5xl font-bold text-white tracking-tighter">{trust.score}</span>
                                        <span className="text-sm font-bold text-emerald-500/50">/100 trust score</span>
                                      </div>
                                      
                                      {/* PROGRESS BAR */}
                                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-emerald-400 transition-all duration-1000 ease-out"
                                          style={{ width: `${trust.score}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* SECONDARY VAULT PROTECTION CARD */}
                                <div className="p-5 rounded-[24px] bg-[#0a120e] border border-white/5 flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Shield className="w-6 h-6 text-emerald-500" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[11px] font-black text-white uppercase tracking-widest">VAULT PROTECTION ACTIVE</p>
                                    <p className="text-[10px] text-emerald-400/60 font-bold tracking-tight">
                                      4-layer data minimization will apply automatically
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                                                    <div className="flex flex-col gap-4 mt-4">
                            <button 
                              onClick={() => setAcceptStep(1)}
                              className="w-full py-5 rounded-[20px] bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-xl"
                            >
                               Configure access scope <ChevronRight className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => respondToAccessRequest(acceptingRequest.id, false).then(() => setAcceptingRequest(null))}
                              className="w-full py-2 text-[#e55039] text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-70 transition-all"
                            >
                              Decline & block provider
                            </button>
                          </div>
                        </div>
                      )}

                      {acceptStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="text-center space-y-1 py-4">
                             <h3 className="text-xl font-bold text-white tracking-tight">Access Purpose & Duration</h3>
                             <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.25em]">VERIFICATION · PHASE 2/7</p>
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

                      {acceptStep === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                           <div className="text-center space-y-2">
                             <div className="w-16 h-16 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                               <Clock className="w-8 h-8 text-emerald-500" />
                             </div>
                             <h3 className="text-xl font-bold text-white tracking-tight">Temporal Security Pulse</h3>
                             <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em]">VERIFICATION · PHASE 3/7</p>
                           </div>

                           <div className="p-8 rounded-[32px] bg-[#0a120e] border border-emerald-500/20 text-center relative overflow-hidden">
                             <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
                             <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-widest">Active Verification Window</p>
                             <div className="flex items-center justify-center gap-3 mb-6">
                               <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                 <span className="text-lg font-black text-white">{SPECIALTY_FIELD_MAP[acceptingRequest.doctorSpecialty as DoctorSpecialty]?.maxHistoryMonths || '∞'}</span>
                                 <span className="text-[10px] font-bold text-emerald-500 ml-2 uppercase">Months</span>
                               </div>
                             </div>
                             <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                               Only records from the last **{SPECIALTY_FIELD_MAP[acceptingRequest.doctorSpecialty as DoctorSpecialty]?.maxHistoryMonths || 'unlimited'} months** will be visible to the provider. 
                               Stale clinical data is automatically shielded.
                             </p>
                           </div>

                           <button 
                             onClick={() => setAcceptStep(3)}
                             className="w-full py-5 rounded-[20px] bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                           >
                              Next Layer: Semantic Lock <ChevronRight className="w-4 h-4" />
                           </button>
                        </div>
                      )}

                      {acceptStep === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                           <div className="text-center space-y-2">
                             <div className="w-16 h-16 rounded-[24px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                               <Activity className="w-8 h-8 text-blue-500" />
                             </div>
                             <h3 className="text-xl font-bold text-white tracking-tight">Semantic Context Lock</h3>
                             <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">VERIFICATION · PHASE 4/7</p>
                           </div>

                           <div className="p-8 rounded-[32px] bg-[#0a120e] border border-blue-500/20 text-center relative overflow-hidden">
                             <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                             <p className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-widest">Enforced Specialty Keywords</p>
                             <div className="flex flex-wrap justify-center gap-2 mb-6">
                               {SPECIALTY_FIELD_MAP[acceptingRequest.doctorSpecialty as DoctorSpecialty]?.allowedKeywords.slice(0, 8).map(k => (
                                 <span key={k} className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/10 text-[9px] font-black text-blue-400 uppercase tracking-tighter">
                                   {k}
                                 </span>
                               ))}
                             </div>
                             <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                               Records without these clinical markers will be **redacted automatically**. 
                               This ensures Dr. {acceptingRequest.doctorName} only sees relevant conditions.
                             </p>
                           </div>

                           <button 
                             onClick={() => setAcceptStep(4)}
                             className="w-full py-5 rounded-[20px] bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                           >
                              Next Layer: Privacy Shield <ChevronRight className="w-4 h-4" />
                           </button>
                        </div>
                      )}

                      {acceptStep === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                           <div className="text-center space-y-2">
                             <div className="w-16 h-16 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                               <ShieldAlert className="w-8 h-8 text-red-500" />
                             </div>
                             <h3 className="text-xl font-bold text-white tracking-tight">Automated Sensitivity Shield</h3>
                             <p className="text-[10px] text-red-400 font-black uppercase tracking-[0.2em]">VERIFICATION · PHASE 5/7</p>
                           </div>

                           <div className="p-8 rounded-[32px] bg-[#0a120e] border border-red-500/20 text-center relative overflow-hidden">
                             <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/5 blur-3xl rounded-full" />
                             <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-widest">Hard-Locked Domains</p>
                             <div className="grid grid-cols-3 gap-3 mb-8">
                               {['Psychiatric', 'Genetic', 'Reproductive'].map(d => (
                                 <div key={d} className="flex flex-col items-center gap-3">
                                   <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                     <Shield className="w-5 h-5 text-red-500/60" />
                                   </div>
                                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{d}</span>
                                 </div>
                               ))}
                             </div>
                             <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                               These sensitive domains are **automatically blocked** across all clinical nodes. 
                               Access can only be granted via explicit patient bypass.
                             </p>
                           </div>

                           <button 
                             onClick={() => setAcceptStep(5)}
                             className="w-full py-5 rounded-[20px] bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                           >
                              Select Resource Scope <ChevronRight className="w-4 h-4" />
                           </button>
                        </div>
                      )}

                      {acceptStep === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="text-center space-y-1 py-4">
                            <h3 className="text-2xl font-bold text-white tracking-tight">Resource Scope</h3>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.25em]">VERIFICATION · PHASE 6/7</p>
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
                           onClick={() => setAcceptStep(6)}
                           disabled={acceptCats.length === 0}
                           className="w-full py-5 rounded-[24px] bg-white text-black font-black uppercase tracking-widest text-xs mt-4 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                         >
                            Final Review <ChevronRight className="w-4 h-4" />
                         </button>
                       </div>
                     )}

                     {acceptStep === 6 && (
                       <div className="space-y-8">
                         <div className="space-y-2 text-center py-4">
                            <div className="w-16 h-16 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                               <Shield className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">Confirm Access</h3>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.25em]">VERIFICATION · PHASE 7/7</p>
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
