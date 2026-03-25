'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Shield, Search, Clock, Tag, CheckCircle, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DoctorSpecialty, type ConsentTokenRequest, type FHIRBundle } from '@/lib/types'
import { TTL_OPTIONS } from '@/lib/consentTokens'
import { filterPatientDataBySpecialty } from '@/lib/minimization'
import { useClinicalStore } from '@/store/useClinicalStore'
import { FilterPreviewCard } from './FilterPreviewCard'

interface ShareRecordsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (request: ConsentTokenRequest) => Promise<void>
  patientId: string
}

const STEPS = ['Recipient', 'Specialty', 'Duration', 'Sensitive Access', 'Review']

export function ShareRecordsModal({ isOpen, onClose, onConfirm, patientId }: ShareRecordsModalProps) {
  const [step, setStep] = useState(0)
  const [recipientName, setRecipientName] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [specialty, setSpecialty] = useState<DoctorSpecialty | null>(null)
  const [ttlSeconds, setTtlSeconds] = useState(3600)
  const [allowedCategories, setAllowedCategories] = useState<string[]>([])
  const [specialtySearch, setSpecialtySearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filteredBundle, setFilteredBundle] = useState<any>(null)
  
  const clinicalData = useClinicalStore()

  // Build full bundle in memory for filtering
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

  // Effect to re-run filtering on state change
  useEffect(() => {
    if (specialty) {
      const filtered = filterPatientDataBySpecialty(fullBundle as FHIRBundle, specialty, allowedCategories)
      setFilteredBundle(filtered)
    }
  }, [specialty, allowedCategories, fullBundle])

  const reset = () => {
    setStep(0)
    setRecipientName('')
    setRecipientId('')
    setSpecialty(null)
    setTtlSeconds(3600)
    setAllowedCategories([])
    setSpecialtySearch('')
    setIsSubmitting(false)
    setFilteredBundle(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleConfirm = async () => {
    if (!specialty || !filteredBundle) return
    setIsSubmitting(true)
    
    const { patient } = (await import('@/store/useUserStore')).useUserStore.getState()
    
    try {
      // Step B: Encryption (Decentralized Handshake)
      const tokenKey = Math.random().toString(36).substring(2, 15)
      const { encryptBundle } = await import('@/lib/crypto')
      const encryptedBundle = await encryptBundle(filteredBundle, tokenKey)
      
      await onConfirm({
        patientId,
        patientName: patient?.name || 'Authorized Patient',
        recipientName,
        recipientId: recipientId || `doc-${Date.now()}`,
        specialty,
        ttlSeconds,
        allowedCategories,
        emergencyAccess: specialty === DoctorSpecialty.EMERGENCY,
        encryptedBundle,
        tokenKey
      })
      
      handleClose()
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
    }
  }

  const filteredSpecialties = Object.values(DoctorSpecialty).filter((s) =>
    s.toLowerCase().includes(specialtySearch.toLowerCase())
  )

  const canProceed = () => {
    switch (step) {
      case 0: return recipientName.trim().length > 0
      case 1: return specialty !== null
      case 2: return ttlSeconds > 0
      case 3: return true
      case 4: return true
      default: return true
    }
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={handleClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="relative bg-[#0d1117] border border-white/10 rounded-[2.5rem] w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Consent Scope</h2>
            <p className="text-xs text-slate-500 mt-1">Patient-Side AI Data Minimization Active</p>
          </div>
          <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-500',
                i <= step ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/5'
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 mb-6 font-medium">
                  <p className="text-sm text-blue-400 leading-relaxed">
                    The full record stays on your device. You are about to build a filtered bundle for a specific recipient.
                  </p>
                </div>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Recipient Doctor/Hospital</span>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter name (e.g. Dr. Mehta)"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all font-medium"
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Doctor ID (Optional)</span>
                  <input
                    type="text"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="e.g. MCI-12345"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all font-medium"
                  />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={specialtySearch}
                    onChange={(e) => setSpecialtySearch(e.target.value)}
                    placeholder="Identify doctor's specialty..."
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all font-medium"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredSpecialties.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpecialty(s)}
                      className={cn(
                        'px-4 py-3.5 rounded-2xl text-xs font-bold text-left transition-all border',
                        specialty === s
                          ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                
                {specialty && filteredBundle && (
                  <FilterPreviewCard 
                    specialty={specialty} 
                    filteredCount={filteredBundle.entry.filter((e: any) => !e.resource.redacted).length}
                    totalCount={fullBundle.entry.length}
                    blockedCategories={filteredBundle.meta.fieldsRedacted}
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Token Duration (TTL)</p>
                {TTL_OPTIONS.map((option) => (
                  <button
                    key={option.seconds}
                    onClick={() => setTtlSeconds(option.seconds)}
                    className={cn(
                      'w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all border',
                      ttlSeconds === option.seconds
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-bold tracking-tight">{option.label}</span>
                    </div>
                    {ttlSeconds === option.seconds && <CheckCircle className="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                 <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 mb-2">
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1.5">Sensitive Access</p>
                  <p className="text-xs text-amber-500/60 leading-relaxed font-medium">
                    Granting these will override default specialty-based minimization logic. Include only if necessary.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'psychiatric', label: 'Mental Health Records', desc: 'Psychiatric assessments, therapy logs' },
                    { id: 'reproductive', label: 'Reproductive Health', desc: 'Fertility, obstetric, OBGYN history' },
                    { id: 'genetic', label: 'Genetic Reports', desc: 'Genomic sequences, hereditary risk' }
                  ].map((cat) => {
                    const isAllowed = allowedCategories.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setAllowedCategories((prev) =>
                            prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                          )
                        }}
                        className={cn(
                          'w-full flex items-start gap-4 px-5 py-4 rounded-3xl transition-all text-left border',
                          isAllowed
                            ? 'bg-white/10 border-amber-500/30 ring-1 ring-amber-500/20'
                            : 'bg-white/5 border-transparent opacity-60'
                        )}
                      >
                         <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                          isAllowed ? "bg-amber-500/20" : "bg-white/10"
                        )}>
                          <Tag className={cn('w-5 h-5', isAllowed ? 'text-amber-500' : 'text-slate-500')} />
                        </div>
                        <div className="flex-1">
                          <p className={cn('text-sm font-bold', isAllowed ? 'text-white' : 'text-slate-400')}>
                            {cat.label}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight font-medium">{cat.desc}</p>
                        </div>
                        <div className={cn(
                          "w-12 h-6 rounded-full p-1 transition-colors duration-300",
                          isAllowed ? "bg-amber-500" : "bg-slate-700"
                        )}>
                          <div className={cn(
                            "w-4 h-4 bg-white rounded-full transition-transform duration-300",
                            isAllowed ? "translate-x-6" : "translate-x-0"
                          )} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 4 && filteredBundle && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Recipient Profile</span>
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400 border border-blue-500/20">{specialty}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500 font-medium">Doctor/Institution</span>
                      <span className="text-xs text-white font-bold">{recipientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500 font-medium">Access Expiry</span>
                      <span className="text-xs text-white font-mono font-bold">
                         {new Date(Date.now() + ttlSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1">Data Breakdown</p>
                   {filteredBundle.entry.map((entry: any, i: number) => {
                     const resource = entry.resource
                     const isRedacted = resource.redacted
                     return (
                       <div key={i} className={cn(
                         "flex items-center justify-between p-4 rounded-2xl border transition-all",
                         isRedacted ? "bg-slate-900/30 border-white/5 opacity-40 scale-[0.98]" : "bg-white/5 border-white/10 hover:bg-white/10"
                       )}>
                         <div className="flex items-center gap-3">
                           {isRedacted ? <Shield className="w-4 h-4 text-slate-600" /> : <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                           <div>
                             <p className={cn("text-[11px] font-bold tracking-tight", isRedacted ? "text-slate-500" : "text-white")}>
                               {isRedacted ? "Hidden Resource" : `${resource.resourceType}: ${resource.code?.text || resource.category?.[0]?.text || 'Clinical Data'}`}
                             </p>
                             <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-tighter font-black">{isRedacted ? resource.category : (resource.effectiveDateTime || resource.authoredOn || 'N/A')}</p>
                           </div>
                         </div>
                         {isRedacted ? (
                           <span className="text-[8px] font-black tracking-widest uppercase text-slate-700">Restricted</span>
                         ) : (
                           <span className="text-[8px] font-black tracking-widest uppercase text-blue-500">Shared</span>
                         )}
                       </div>
                     )
                   })}
                </div>

                {isSubmitting && (
                  <p className="mt-4 text-center text-xs text-[#5B8DEF] animate-pulse uppercase tracking-widest font-black">Building Secure Bundle...</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || isSubmitting}
            className="flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => step === 4 ? handleConfirm() : setStep(step + 1)}
            disabled={!canProceed() || isSubmitting}
            className="flex items-center gap-2 px-10 py-4 bg-white text-black text-xs font-black uppercase tracking-widest rounded-[1.25rem] hover:bg-slate-200 disabled:opacity-30 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            {step === 4 ? (isSubmitting ? 'Securing...' : 'Authorize') : 'Continue'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
