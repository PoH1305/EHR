'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Save, Activity, Heart, Thermometer, Wind } from 'lucide-react'
import type { TemporaryRecord, VitalReading } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TemporaryRecordFormProps {
  tempId: string
  onSave: (data: Partial<TemporaryRecord>) => void
}

export function TemporaryRecordForm({ tempId, onSave }: TemporaryRecordFormProps) {
  const [formData, setFormData] = useState({
    approximateAge: '',
    gender: 'unknown' as const,
    condition: '',
    notes: '',
    treatments: [] as string[],
    currentTreatment: ''
  })

  // Auto-save logic every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      onSave({
        approximateAge: formData.approximateAge ? parseInt(formData.approximateAge) : null,
        gender: formData.gender,
        condition: formData.condition,
        notes: formData.notes
      })
    }, 30000)
    return () => clearInterval(timer)
  }, [formData, onSave])

  const addTreatment = () => {
    if (!formData.currentTreatment) return
    setFormData(prev => ({
      ...prev,
      treatments: [...prev.treatments, prev.currentTreatment],
      currentTreatment: ''
    }))
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
      {children}
    </label>
  )

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">Clinical Entry</h2>
        <p className="text-2xl font-mono font-bold text-blue-400">{tempId}</p>
      </div>

      {/* Basic Stats */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label>Approx. Age</Label>
          <input 
            type="number" 
            value={formData.approximateAge}
            onChange={(e) => setFormData(prev => ({ ...prev, approximateAge: e.target.value }))}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50"
            placeholder="Years"
          />
        </div>
        <div>
          <Label>Gender</Label>
          <select 
            value={formData.gender}
            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 appearance-none"
          >
            <option value="unknown">Unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      {/* Presenting Condition */}
      <div>
        <Label>Presenting Condition *</Label>
        <textarea 
          required
          rows={2}
          value={formData.condition}
          onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 resize-none"
          placeholder="e.g., Unconscious male, chest trauma..."
        />
      </div>

      {/* Treatments Given */}
      <div>
        <Label>Treatments Given</Label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input 
              type="text"
              value={formData.currentTreatment}
              onChange={(e) => setFormData(prev => ({ ...prev, currentTreatment: e.target.value }))}
              placeholder="e.g. IV Fluids 500ml"
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50"
            />
            <button 
              onClick={addTreatment}
              className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 active:scale-90 transition-all"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.treatments.map((t, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <Label>Clinical Notes</Label>
        <textarea 
          rows={4}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 resize-none"
          placeholder="Additional observations, family contact info, etc."
        />
      </div>

      <button 
        onClick={() => onSave({
          approximateAge: formData.approximateAge ? parseInt(formData.approximateAge) : null,
          gender: formData.gender,
          condition: formData.condition,
          treatmentsGiven: formData.treatments,
          notes: formData.notes
        })}
        className="fixed bottom-8 left-6 right-6 py-4 rounded-3xl bg-blue-500 text-white flex items-center justify-center gap-2 font-bold shadow-2xl shadow-blue-500/20 z-10 active:scale-95 transition-all"
      >
        <Save className="w-5 h-5" />
        Save & Continue Treatment
      </button>
    </div>
  )
}
