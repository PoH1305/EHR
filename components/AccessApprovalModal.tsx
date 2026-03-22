'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Clock, Tag, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DoctorSpecialty, type AccessRequest } from '@/lib/types'
import { TTL_OPTIONS } from '@/lib/consentTokens'
import { SENSITIVE_FIELD_CATEGORIES } from '@/lib/aiFilter'
import { BiometricUnlock } from './BiometricUnlock'
import { useConsentStore } from '@/store/useConsentStore'

interface AccessApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  request: AccessRequest
}

const STEPS = ['Specialty', 'Duration', 'Sensitive Access', 'Review', 'Verify']

export function AccessApprovalModal({ isOpen, onClose, request }: AccessApprovalModalProps) {
  const [step, setStep] = useState(0)
  const [specialty, setSpecialty] = useState<DoctorSpecialty>(DoctorSpecialty.GENERAL_PRACTITIONER)
  const [ttlSeconds, setTtlSeconds] = useState(3600)
  const [allowedCategories, setAllowedCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { generateToken, respondToAccessRequest } = useConsentStore()

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await generateToken({
        patientId: request.patientId,
        recipientName: request.doctorName,
        recipientId: request.doctorId,
        specialty,
        ttlSeconds,
        allowedCategories,
        emergencyAccess: specialty === DoctorSpecialty.EMERGENCY,
      })
      
      respondToAccessRequest(request.id, true)
      onClose()
    } catch {
      setIsSubmitting(false)
    }
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen || !mounted) return null


  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#080D16] border border-white/10 rounded-[40px] w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-white">Approve Access</h2>
            <p className="text-white/40 text-xs mt-1">Request from {request.doctorName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-[#5B8DEF]' : 'bg-white/5')} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-white/60 mb-4">Set the clinical context for this connection:</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(DoctorSpecialty).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpecialty(s)}
                      className={cn(
                        'px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all text-center',
                        specialty === s ? 'bg-[#1A3A8F] text-white ring-2 ring-[#5B8DEF]/50' : 'bg-white/5 text-white/40 hover:bg-white/10'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {TTL_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    onClick={() => setTtlSeconds(opt.seconds)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-2xl transition-all',
                      ttlSeconds === opt.seconds ? 'bg-[#1A3A8F]/20 border border-[#1A3A8F]/40 text-[#5B8DEF]' : 'bg-white/5 border border-transparent text-white/40'
                    )}
                  >
                    <span className="text-sm font-bold uppercase tracking-widest">{opt.label}</span>
                    <Clock className="w-4 h-4" />
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1A3A8F]/30 to-purple-500/10 border border-[#1A3A8F]/30">
                  <div className="flex items-center gap-2 text-[#5B8DEF] mb-3">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-widest">AI Engine Active</span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    EHI Engine has pre-filtered data for <strong>{specialty}</strong>. Below are additional sensitive categories you can optionally share.
                  </p>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(SENSITIVE_FIELD_CATEGORIES).map(([key, desc]) => (
                    <button
                      key={key}
                      onClick={() => setAllowedCategories(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])}
                      className={cn(
                        'w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left',
                        allowedCategories.includes(key) ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-transparent'
                      )}
                    >
                      <Tag className={cn('w-4 h-4 mt-0.5', allowedCategories.includes(key) ? 'text-amber-400' : 'text-white/20')} />
                      <div>
                        <p className={cn('text-xs font-bold uppercase tracking-wider', allowedCategories.includes(key) ? 'text-amber-400' : 'text-white/60')}>
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-white/30 mt-1 leading-relaxed">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Recipient</span>
                    <span className="text-sm font-bold text-white">{request.doctorName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Specialty</span>
                    <span className="text-sm font-bold text-[#5B8DEF]">{specialty}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Duration</span>
                    <span className="text-sm font-bold text-white">{TTL_OPTIONS.find(o => o.seconds === ttlSeconds)?.label}</span>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col items-center py-8">
                <BiometricUnlock onSuccess={handleConfirm} />
                {isSubmitting && <p className="mt-4 text-xs text-[#5B8DEF] animate-pulse">Generating Secure Token...</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 4 && (
          <div className="flex justify-between mt-10">
            <button
               onClick={() => setStep(s => s - 1)}
               disabled={step === 0}
               className="text-xs font-bold text-white/40 uppercase tracking-widest disabled:opacity-30"
            >
              Back
            </button>
            <button
               onClick={() => setStep(s => s + 1)}
               className="px-8 py-3 bg-[#1A3A8F] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#1A3A8F]/80 transition-all flex items-center gap-2"
            >
              {step === 3 ? 'Finalize' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  )
}
