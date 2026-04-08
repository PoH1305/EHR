'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, CheckCircle2, Loader2, Save, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useUserStore } from '@/store/useUserStore'
import type { ClinicalNote } from '@/lib/types'

interface AddNoteModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
}

export function AddNoteModal({ isOpen, onClose, patientId, patientName }: AddNoteModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    content: '',
    type: 'PROGRESS_NOTE' as ClinicalNote['type'],
    tags: ''
  })

  const { addClinicalNote, addAuditEvent } = useClinicalStore()
  const { firebaseUid, firebaseEmail } = useUserStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const note: ClinicalNote = {
      id: `note-${Date.now()}`,
      patientId,
      doctorId: firebaseUid || 'doctor',
      doctorName: `Dr. ${firebaseEmail?.split('@')[0] || 'Unknown'}`,
      timestamp: new Date().toISOString(),
      content: formData.content,
      type: formData.type,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    }

    try {
      await addClinicalNote(note)
      await addAuditEvent({
        id: crypto.randomUUID(),
        type: 'RECORD_CREATED',
        timestamp: new Date().toISOString(),
        userId: firebaseUid || 'doctor',
        description: `New clinical note added by Dr. ${firebaseEmail || 'Unknown'}`,
        metadata: { noteType: formData.type, patientId }
      }, patientId)
      
      setStep('success')
    } catch (error) {
      console.error('Failed to add clinical note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Clinical Note</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Patient: {patientName}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-1">Note Type</label>
                  <div className="flex gap-2">
                    {['PROGRESS_NOTE', 'CONSULT_NOTE', 'EMERGENCY_NOTE'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type as any })} // eslint-disable-line @typescript-eslint/no-explicit-any
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                          formData.type === type 
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                            : "bg-white/5 border-white/5 text-white/20 hover:text-white/40"
                        )}
                      >
                        {type.split('_')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-1">Observations & Plan</label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Describe clinical findings, physical exam results, and treatment plan..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10 min-h-[160px] resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-3 h-3 text-white/20" />
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30">Tags (comma separated)</label>
                  </div>
                  <input
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="follow-up, observation, cardiology..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Clinical Note
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Note Saved</h2>
              <p className="text-white/40 text-sm mb-8 leading-relaxed">
                Your clinical observations for <strong>{patientName}</strong> have been securely recorded.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
