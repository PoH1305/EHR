'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pill, CheckCircle2, Loader2 } from 'lucide-react'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useUserStore } from '@/store/useUserStore'
import type { MedicationRequest } from 'fhir/r4'

interface AddPrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
}

export function AddPrescriptionModal({ isOpen, onClose, patientId, patientName }: AddPrescriptionModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    medication: '',
    dosage: '',
    frequency: '1 tablet daily',
    duration: '7 days',
    instructions: ''
  })

  const { addMedication, addAuditEvent } = useClinicalStore()
  const { firebaseUid, firebaseEmail } = useUserStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Construct FHIR MedicationRequest
    const medicationRequest: MedicationRequest = {
      resourceType: 'MedicationRequest',
      id: `med-${Math.random().toString(36).substr(2, 9)}`,
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        text: formData.medication
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      authoredOn: new Date().toISOString(),
      dosageInstruction: [
        {
          text: `${formData.dosage} ${formData.frequency} for ${formData.duration}. ${formData.instructions}`
        }
      ]
    }

    try {
      await addMedication(patientId, medicationRequest)
      await addAuditEvent({
        id: crypto.randomUUID(),
        type: 'RECORD_CREATED',
        timestamp: new Date().toISOString(),
        userId: firebaseUid || 'doctor',
        description: `New prescription for ${formData.medication} added by Dr. ${firebaseEmail || 'Unknown'}`,
        metadata: { medication: formData.medication, patientId }
      }, patientId)
      
      setStep('success')
    } catch (error) {
      console.error('Failed to add prescription:', error)
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
        className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
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
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Pill className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">New Prescription</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Patient: {patientName}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-1">Medication Name</label>
                  <input
                    required
                    value={formData.medication}
                    onChange={e => setFormData({ ...formData, medication: e.target.value })}
                    placeholder="e.g., Amlodipine 5mg"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-1">Dosage</label>
                    <input
                      required
                      value={formData.dosage}
                      onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                      placeholder="e.g., 1 tablet"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-1">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                    >
                      <option value="1 tablet daily">Once daily</option>
                      <option value="2 tablets daily">Twice daily</option>
                      <option value="3 tablets daily">Thrice daily</option>
                      <option value="As needed">As needed (PRN)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-1">Special Instructions</label>
                  <textarea
                    value={formData.instructions}
                    onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Take after meals, avoid alcohol..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10 min-h-[80px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pill className="w-5 h-5" />}
                  Issue Prescription
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
              <h2 className="text-2xl font-bold text-white mb-2">Prescription Issued</h2>
              <p className="text-white/40 text-sm mb-8 leading-relaxed">
                The prescription for <strong>{formData.medication}</strong> has been securely added to {patientName}&apos;s record.
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
