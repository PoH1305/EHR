'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Search, 
  X, 
  Loader2, 
  Sparkles, 
  QrCode, 
  Clipboard, 
  CheckCircle2, 
  User,
  AlertCircle
} from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useConsentStore } from '@/store/useConsentStore'
import { DoctorSpecialty, type AccessRequest } from '@/lib/types'
import { cn, autoFormatEHI } from '@/lib/utils'
import { createPortal } from 'react-dom'
import { db } from '@/lib/db'
import type { PatientProfile } from '@/lib/types'

interface AddPatientModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
  const [step, setStep] = useState<'id' | 'success'>('id')
  const [patientId, setPatientId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [foundPatient, setFoundPatient] = useState<PatientProfile | null>(null)
  const [recentRequests, setRecentRequests] = useState<AccessRequest[]>([])
  const { createAccessRequest, parseEHILink } = useConsentStore()
  const { firebaseEmail, firebaseUid } = useUserStore()
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Live lookup from Supabase
  useEffect(() => {
    const lookupPatient = async () => {
      if (patientId.length >= 14) {
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('health_id', patientId)
            .maybeSingle()
            
          if (error) throw error
          
          if (data && data.data) {
            setFoundPatient(data.data as PatientProfile)
          } else {
            setFoundPatient(null)
          }
        } catch (err) {
          console.error('[AddPatientModal] Supabase lookup error:', err)
          setFoundPatient(null)
        }
      } else {
        setFoundPatient(null)
      }
    }
    
    lookupPatient()
  }, [patientId])

  // Recent requests
  useEffect(() => {
    if (isOpen && db) {
      db.access_requests.orderBy('requestedAt').reverse().limit(3).toArray().then(setRecentRequests)
    }
  }, [isOpen])

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Reset when closing
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep('id')
        setPatientId('')
        setIsSubmitting(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const [reason, setReason] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'vitals', 'conditions', 'medications', 'allergies', 'clinicalNotes', 'attachments'
  ])

  const categories = [
    { id: 'vitals', label: 'Vitals', icon: Sparkles },
    { id: 'medications', label: 'Prescriptions', icon: Clipboard },
    { id: 'conditions', label: 'Conditions', icon: Shield },
    { id: 'clinicalNotes', label: 'Notes', icon: User },
    { id: 'attachments', label: 'Lab Reports', icon: Search }
  ]

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!patientId.trim()) return
    setIsSubmitting(true)
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1000))
    
    const { patient: doctorProfile } = useUserStore.getState()
    const normalizedPatientId = patientId.trim().toUpperCase()
    
    try {
      await createAccessRequest(
        normalizedPatientId, 
        firebaseUid || 'doc-unknown', 
        doctorProfile?.name || firebaseEmail?.split('@')[0] || 'Medical Practitioner', 
        (doctorProfile as any)?.specialty || DoctorSpecialty.GENERAL_PRACTITIONER, 
        'Clinical Health Network',
        reason,
        foundPatient?.name || undefined,
        selectedCategories
      )
      
      setIsSubmitting(false)
      setStep('success')
      
      // Refresh recent
      if (db) {
        db.access_requests.orderBy('requestedAt').reverse().limit(3).toArray()
          .then(setRecentRequests)
      }
    } catch (err) {
      console.error('[AddPatientModal] Submission failed:', err)
      setIsSubmitting(false)
      // Error is already in store.syncError
    }
  }



  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        className="relative w-full max-w-sm bg-[#080D16] border border-white/5 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Connect Patient</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">


            {step === 'id' && (
              <motion.div
                key="id"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 block">Patient EHI Identifier</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(autoFormatEHI(e.target.value.toUpperCase()))}
                      placeholder="EHI-XXXX-XXXX-X"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-[#1A3A8F] transition-all font-mono tracking-wider"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  {foundPatient && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 overflow-hidden">
                        {foundPatient.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={foundPatient.photoUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <User className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white/90">{foundPatient.name}</span>
                        <div className="flex items-center gap-1.5">
                           <span className="text-[9px] text-white/40 uppercase tracking-widest">Identity Verified</span>
                           <CheckCircle2 className="w-3 h-3 text-green-500" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {foundPatient && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] block">Data Access Scope</label>
                      <div className="grid grid-cols-2 gap-2">
                         {categories.map(cat => (
                           <button
                             key={cat.id}
                             type="button"
                             onClick={() => toggleCategory(cat.id)}
                             className={cn(
                               "flex items-center gap-2 p-3 rounded-xl border text-[9px] font-bold uppercase tracking-wider transition-all",
                               selectedCategories.includes(cat.id)
                                 ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                                 : "bg-white/5 border-white/5 text-white/20 hover:bg-white/10"
                             )}
                           >
                              <cat.icon className="w-3 h-3" />
                              {cat.label}
                           </button>
                         ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] block">Intent of Access</label>
                      <span className="text-[9px] text-blue-500/60 font-bold uppercase tracking-widest">Required</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                        {[
                          'Checkup',
                          'Consultation',
                          'Emergency',
                          'Follow-up',
                          'Lab Review'
                        ].map(chip => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setReason(chip)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-tighter transition-all",
                              reason === chip 
                                ? "bg-blue-500 border-blue-500 text-white" 
                                : "bg-white/5 border-white/5 text-white/40 hover:border-white/20"
                            )}
                          >
                            {chip}
                          </button>
                        ))}
                    </div>

                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Or enter a custom clinical reason..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500/50 transition-all min-h-[100px] resize-none"
                    />
                  </div>
                )}

                {useConsentStore.getState().syncError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Sync Failed</span>
                    </div>
                    <p className="text-[10px] text-red-400/80 leading-relaxed max-h-[40px] overflow-hidden">
                      {useConsentStore.getState().syncError}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!patientId || isSubmitting || (!!foundPatient && selectedCategories.length === 0)}
                  className={cn("w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all shadow-xl", patientId && !isSubmitting ? "bg-[#1A3A8F] text-white shadow-[#1A3A8F]/20" : "bg-white/5 text-white/20 cursor-not-allowed")}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Secure Access"}
                </button>
                <button onClick={onClose} className="w-full text-xs text-white/20 font-bold uppercase tracking-widest hover:text-white/40 transition-colors" disabled={isSubmitting}>Cancel</button>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-6 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Request Sent</h3>
                <p className="text-sm text-white/40 mb-8 leading-relaxed">Access request sent to patient. They will receive a notification in their activity tab.</p>
                <button onClick={onClose} className="w-full py-4 rounded-xl bg-white/10 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/15 transition-all">Done</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
