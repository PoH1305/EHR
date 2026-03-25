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
  Key, // This import is no longer needed if PinUnlock is removed and Key icon is not used elsewhere
  ShieldAlert,
  Search,
  Tag,
  History,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { useConsentStore } from '@/store/useConsentStore'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { cn } from '@/lib/utils'
import { DoctorSpecialty, type ConsentTokenRequest, type FHIRBundle, type AccessRequest, type ConsentToken } from '@/lib/types'
import { TTL_OPTIONS } from '@/lib/consentTokens'
import { filterPatientDataBySpecialty, getRecommendedCategories } from '@/lib/minimization'
// import { PinUnlock } from '../PinUnlock' // Removed as per instruction
import { FilterPreviewCard } from '../FilterPreviewCard'

interface AccessCenterModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'requests' | 'active' | 'share'

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

  // State for New Share Flow
  const [shareStep, setShareStep] = useState(0)
  const [recipientName, setRecipientName] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [specialty, setSpecialty] = useState<DoctorSpecialty | null>(null)
  const [ttlSeconds, setTtlSeconds] = useState(3600)
  const [allowedCategories, setAllowedCategories] = useState<string[]>([])
  const [specialtySearch, setSpecialtySearch] = useState('')
  const [filteredBundle, setFilteredBundle] = useState<any>(null)

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

  // Share Bundle Logic
  const fullBundle = useMemo(() => ({
    resourceType: 'Bundle' as const,
    entry: [
      ...clinicalData.conditions.map(c => ({ resource: c })),
      ...clinicalData.observations.map(o => ({ resource: o })),
      ...clinicalData.medications.map(m => ({ resource: m })),
      ...clinicalData.allergies.map(a => ({ resource: a })),
      ...clinicalData.diagnosticReports.map(d => ({ resource: d })),
      ...clinicalData.immunizations.map(i => ({ resource: i })),
      ...clinicalData.procedures.map(p => ({ resource: p }))
    ]
  }), [clinicalData])

  useEffect(() => {
    if (specialty) {
      const filtered = filterPatientDataBySpecialty(fullBundle as FHIRBundle, specialty, allowedCategories)
      setFilteredBundle(filtered)
    }
  }, [specialty, allowedCategories, fullBundle])

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING')

  const toggleCategory = (requestId: string, catId: string) => {
    setSelectedCats(prev => {
      const current = prev[requestId] || [] // UNCHECKED BY DEFAULT (Data Minimization)
      const next = current.includes(catId)
        ? current.filter(c => c !== catId)
        : [...current, catId]
      return { ...prev, [requestId]: next }
    })
  }

  const handleShareConfirm = async () => {
    if (!specialty || !filteredBundle || !patient) return
    
    try {
      const tokenKey = Math.random().toString(36).substring(2, 15)
      const { encryptBundle } = await import('@/lib/crypto')
      const encryptedBundle = await encryptBundle(filteredBundle, tokenKey)
      
      await generateToken({
        patientId: patient.id,
        patientName: patient.name,
        recipientName,
        recipientId: recipientId || `doc-${Date.now()}`,
        specialty,
        ttlSeconds,
        allowedCategories,
        emergencyAccess: specialty === DoctorSpecialty.EMERGENCY,
        encryptedBundle,
        tokenKey
      })
      
      setActiveTab('active')
      setShareStep(0)
    } catch (err) {
      console.error(err)
    }
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
            { id: 'active', label: 'Active', icon: History, count: activeTokens.length },
            { id: 'share', label: 'Share', icon: Share2 }
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
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {pendingRequests.length > 0 ? (
                  pendingRequests.map(req => {
                    const selected = selectedCats[req.id] || []
                    return (
                      <div key={req.id} className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/40" />
                        
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                              <Shield className="w-7 h-7 text-blue-500" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white tracking-tight">{req.doctorName}</h4>
                              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{req.organization}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                             <button 
                               onClick={() => respondToAccessRequest(req.id, false)}
                               className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                             >
                               <X className="w-5 h-5" />
                             </button>
                             <button 
                               onClick={() => respondToAccessRequest(req.id, true, selected)}
                               disabled={selected.length === 0}
                               className="px-6 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-500 hover:bg-green-500/30 transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-30 flex items-center gap-2"
                             >
                               {selected.length === 0 ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                               Approve
                             </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* AI Recommendation Banner */}
                          {req.doctorSpecialty && (
                            <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                               <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                               <div className="flex-1">
                                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Semi-Agentic Insight</p>
                                  <p className="text-[11px] text-white/60 leading-tight">Recommended scope for {req.doctorSpecialty} context</p>
                               </div>
                               <button 
                                 onClick={() => {
                                   const recommended = getRecommendedCategories(req.doctorSpecialty)
                                   setSelectedCats(prev => ({ ...prev, [req.id]: recommended }))
                                 }}
                                 className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-blue-400 transition-all active:scale-95"
                               >
                                 Auto-Select
                               </button>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Minimization: Select Shared Scope</p>
                              <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">{selected.length} Selected</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {categories.map(cat => {
                                const isRecommended = req.doctorSpecialty && getRecommendedCategories(req.doctorSpecialty).includes(cat.id)
                                return (
                                  <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(req.id, cat.id)}
                                    className={cn(
                                      "px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] border transition-all relative overflow-hidden group/cat",
                                      selected.includes(cat.id)
                                        ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                                        : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                                    )}
                                  >
                                    {isRecommended && !selected.includes(cat.id) && (
                                      <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                      {cat.label}
                                      {isRecommended && <Sparkles className="w-3 h-3 opacity-40 group-hover/cat:opacity-100 transition-opacity" />}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
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

            {activeTab === 'share' && (
              <motion.div
                key="share"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                {/* Step Content */}
                <div className="space-y-8">
                  {shareStep === 0 && (
                    <div className="space-y-6">
                      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                        <p className="text-sm text-blue-400/80 leading-relaxed font-medium">
                          Build a localized, encrypted clinical bundle for a specific recipient. 
                          The full record never leaves your device.
                        </p>
                      </div>
                      <div className="space-y-4">
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Recipient Name</span>
                          <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Dr. Smith or Clinical Hub"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </label>
                        <div className="relative">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Doctor Specialty (For AI Minimization)</span>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {Object.values(DoctorSpecialty).map(s => (
                              <button
                                key={s}
                                onClick={() => setSpecialty(s)}
                                className={cn(
                                  "px-4 py-3 rounded-xl text-[10px] font-bold text-left border transition-all",
                                  specialty === s ? "bg-blue-500 border-blue-500 text-white" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {shareStep === 1 && (
                    <div className="space-y-6">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Access Configuration</p>
                       <div className="grid grid-cols-2 gap-3">
                         {TTL_OPTIONS.map(opt => (
                           <button
                             key={opt.seconds}
                             onClick={() => setTtlSeconds(opt.seconds)}
                             className={cn(
                               "px-6 py-4 rounded-3xl border flex items-center justify-between transition-all",
                               ttlSeconds === opt.seconds ? "bg-blue-500 border-blue-500 text-white" : "bg-white/5 border-transparent text-slate-500"
                             )}
                           >
                              <span className="text-sm font-bold">{opt.label}</span>
                              <Clock className="w-4 h-4 opacity-40" />
                           </button>
                         ))}
                       </div>

                       <div className="space-y-3">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Sensitive Categories</span>
                         <div className="flex flex-wrap gap-2">
                            {['psychiatric', 'reproductive', 'genetic'].map(cat => (
                              <button
                                key={cat}
                                onClick={() => setAllowedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                                className={cn(
                                  "px-4 py-3 rounded-2xl border flex items-center gap-2 transition-all",
                                  allowedCategories.includes(cat) ? "bg-amber-500/20 border-amber-500/40 text-amber-500" : "bg-white/5 border-transparent text-slate-600"
                                )}
                              >
                                <Tag className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase">{cat}</span>
                              </button>
                            ))}
                         </div>
                       </div>
                    </div>
                  )}

                  {/* shareStep === 2 (PIN Unlock) block removed */}

                  {/* Navigation Footer for Share */}
                  {/* Condition changed from shareStep < 2 to shareStep < 1, and the "Continue" button now directly calls handleShareConfirm on the last step */}
                  {shareStep < 1 && ( // Only show navigation if not on the final step (which is now step 1)
                    <div className="flex justify-between pt-8 border-t border-white/5">
                      <button 
                        onClick={() => setShareStep(prev => Math.max(0, prev - 1))}
                        disabled={shareStep === 0}
                        className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <button 
                        onClick={handleShareConfirm}
                        disabled={shareStep === 0 ? !recipientName || !specialty : false}
                        className="px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 disabled:opacity-20 flex items-center gap-2"
                      >
                        {shareStep === 1 ? 'Generate Token' : 'Continue'} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
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
