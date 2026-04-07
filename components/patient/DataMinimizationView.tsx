'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Check, 
  ShieldCheck, 
  Activity, 
  Plus,
  FlaskConical,
  Heart,
  Pill,
  ClipboardList,
  AlertCircle,
  FileText,
  Clock,
  Eye,
  Lock,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/GlassCard'
import { useClinicalStore } from '@/store/useClinicalStore'
import { DoctorSpecialty } from '@/lib/types'
import type { AccessRequest } from '@/lib/types'

interface DataMinimizationViewProps {
  request: AccessRequest
  onClose: () => void
  onConfirm: (categories: string[]) => void
}

const CATEGORIES = [
  { id: 'vitals', label: 'Vital signs', description: 'BP, HR, SpO2, temperature', icon: Heart },
  { id: 'medicalImages', label: 'ECG / cardiac', description: 'Electrocardiograms, Holter data', icon: Activity },
  { id: 'attachments', label: 'Lab results', description: 'Blood panel, urinalysis, cultures', icon: FlaskConical },
  { id: 'imaging', label: 'Imaging', description: 'X-ray, MRI, CT, ultrasound', icon: FileText },
  { id: 'medications', label: 'Medications', description: 'Current & past prescriptions', icon: Pill },
  { id: 'clinicalNotes', label: 'Visit notes', description: 'Consultation summaries', icon: ClipboardList },
  { id: 'allergies', label: 'Allergies', description: 'Allergy history & reactions', icon: AlertCircle },
  { id: 'auditEvents', label: 'Audit logs', description: 'Who accessed your data', icon: ShieldCheck }
]

const SPECIALTIES = [
  'Cardiology', 'Oncology', 'Neurology', 'General Practice', 'Endocrinology', 'Custom'
]

const SPECIALTY_MAP: Record<string, string[]> = {
  'Cardiology': ['vitals', 'medicalImages', 'attachments', 'medications'],
  'Oncology': ['attachments', 'imaging', 'clinicalNotes', 'medications'],
  'Neurology': ['imaging', 'clinicalNotes', 'medications', 'vitals'],
  'General Practice': ['vitals', 'medications', 'allergies', 'clinicalNotes', 'attachments'],
  'Endocrinology': ['vitals', 'attachments', 'medications'],
  'Custom': []
}

export function DataMinimizationView({ request, onClose, onConfirm }: DataMinimizationViewProps) {
  const [selectedCats, setSelectedCats] = useState<string[]>(request.sharedCategories || CATEGORIES.map(c => c.id))
  const [activeSpecialty, setActiveSpecialty] = useState<string>(request.doctorSpecialty || 'Custom')
  
  const { 
    vitals, conditions, medications, allergies, attachments, 
    clinicalNotes, medicalImages, auditEvents 
  } = useClinicalStore()

  // Pre-calculate record counts per category
  const categoryCounts = useMemo(() => ({
    vitals: vitals.length,
    medicalImages: medicalImages.length,
    attachments: attachments.length,
    medications: medications.length,
    conditions: conditions.length,
    allergies: allergies.length,
    clinicalNotes: clinicalNotes.length,
    auditEvents: auditEvents.length,
    imaging: attachments.filter(a => a.fileType?.includes('image') || a.fileName.match(/\.(jpg|jpeg|png|dcm)/i)).length
  }), [vitals, conditions, medications, allergies, attachments, clinicalNotes, medicalImages, auditEvents])

  const toggleCategory = (id: string) => {
    setSelectedCats(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
    setActiveSpecialty('Custom')
  }

  const handleSpecialtyClick = (specialty: string) => {
    setActiveSpecialty(specialty)
    if (specialty !== 'Custom') {
      setSelectedCats(SPECIALTY_MAP[specialty] || [])
    }
  }

  const allRecords = useMemo(() => {
    const list: any[] = []
    
    // Flatten records into a single list for preview
    medicalImages.forEach(r => list.push({ ...r, category: 'medicalImages', title: r.description || 'Medical Image', date: r.timestamp }))
    attachments.forEach(r => list.push({ ...r, category: 'attachments', title: r.fileName, date: r.uploadedAt }))
    medications.forEach(r => list.push({ ...r, category: 'medications', title: (r as any).medicationCodeableConcept?.text || 'Medication', date: r.authoredOn }))
    vitals.forEach(r => list.push({ ...r, id: `vital-${r.type}`, category: 'vitals', title: r.type, date: r.readings?.[0]?.timestamp, latestValue: r.latestValue, unit: r.unit }))
    
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [medicalImages, attachments, medications, vitals])

  const stats = useMemo(() => {
    const sharedCount = allRecords.filter(r => selectedCats.includes(r.category)).length
    const totalCount = allRecords.length
    const withheldCount = totalCount - sharedCount
    const exposure = totalCount > 0 ? Math.round((sharedCount / totalCount) * 100) : 0
    
    return { sharedCount, totalCount, withheldCount, exposure }
  }, [allRecords, selectedCats])

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden"
    >
      {/* Header Overlay */}
      <div className="border-b border-white/5 bg-[#0d1117] px-6 py-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1.5 leading-none">Incoming Access Request</p>
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-[#E3F2ED] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[#2D6A4F]">
                  {request.doctorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
             </div>
             <div>
                <h2 className="text-md font-bold text-white tracking-tight">{request.doctorName}</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
                  <Plus className="w-2.5 h-2.5 text-blue-400" />
                  <span className="text-[9px] font-bold text-blue-400">{request.doctorSpecialty}</span>
                </div>
             </div>
             <p className="hidden md:block text-[11px] text-white/40 ml-8 font-medium">{request.organization}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={onClose} className="px-5 py-2 rounded-xl bg-white/5 text-xs font-bold text-white hover:bg-white/10 transition-all border border-white/5">Deny</button>
           <button className="px-6 py-2 rounded-xl bg-white/5 text-xs font-bold text-white/60 hover:bg-white/10 transition-all border border-white/5 cursor-not-allowed">Configure & share</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide space-y-12 max-w-4xl mx-auto w-full">
        
        {/* Quick Filter Bar */}
        <section>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Quick filter by doctor specialty</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
            {SPECIALTIES.map(s => (
              <button
                key={s}
                onClick={() => handleSpecialtyClick(s)}
                className={cn(
                  "px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border",
                  activeSpecialty === s 
                    ? "bg-white text-black border-white" 
                    : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Categories Grid */}
        <section>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-6">Record Categories</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "relative text-left p-5 rounded-[24px] border-2 transition-all group overflow-hidden",
                  selectedCats.includes(cat.id) 
                    ? "bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_0_20px_-10px_rgba(16,185,129,0.3)]" 
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={cn("text-xs font-black tracking-tight mb-1", selectedCats.includes(cat.id) ? "text-white" : "text-white/60")}>{cat.label}</h4>
                    <p className="text-[10px] text-white/30 font-medium leading-relaxed mb-4">{cat.description}</p>
                    <p className="text-[10px] font-black text-[#5B8DEF] uppercase tracking-widest">{categoryCounts[cat.id as keyof typeof categoryCounts] || 0} records</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    selectedCats.includes(cat.id) ? "bg-emerald-500 border-emerald-500" : "bg-white/5 border-white/10"
                  )}>
                    {selectedCats.includes(cat.id) && <Check className="w-3.5 h-3.5 text-black" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Stats Row */}
        <section className="flex items-center justify-between border-t border-b border-white/5 py-10 px-4">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Shared</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">{stats.sharedCount}</span>
                <span className="text-[10px] font-medium text-white/30">of {stats.totalCount} records</span>
              </div>
           </div>
           
           <div className="space-y-1 text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Withheld</p>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-2xl font-black text-white">{stats.withheldCount}</span>
                <span className="text-[10px] font-medium text-white/30 italic">protected by you</span>
              </div>
           </div>
           
           <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Exposure</p>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-2xl font-black text-white">{stats.exposure}%</span>
                <span className="text-[10px] font-medium text-white/30">data shared</span>
              </div>
           </div>
        </section>

        {/* Record Preview List */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Record Preview</p>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">{stats.sharedCount} of {stats.totalCount} visible to doctor</p>
          </div>
          
          <div className="space-y-2 pb-32">
            {allRecords.map((rec, i) => {
              const isShared = selectedCats.includes(rec.category)
              const Icon = CATEGORIES.find(c => c.id === rec.category)?.icon || FileText
              
              return (
                <div key={rec.id || i} className={cn(
                  "p-4 rounded-2xl border transition-all flex items-center justify-between",
                  isShared ? "bg-white/[0.04] border-white/10" : "bg-white/[0.02] border-white/5 opacity-40 border-dashed"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isShared ? "bg-white/5" : "bg-white/[0.02]")}>
                       <Icon className={cn("w-5 h-5", isShared ? "text-white/60" : "text-white/20")} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight leading-none mb-1.5">{rec.title}</h4>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{new Date(rec.date).toLocaleDateString()} {rec.category === 'vitals' && `· ${rec.latestValue} ${rec.unit}`}</p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                    isShared ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-white/5 border-white/5 text-white/10"
                  )}>
                    {isShared ? 'Shared' : 'Hidden'}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Persistent Footer */}
      <div className="absolute bottom-6 left-6 right-6">
        <GlassCard className="p-5 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 bg-[#0d1117]/80 backdrop-blur-2xl">
           <div className="text-center md:text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1">Share filtered view with {request.doctorName}</h4>
              <p className="text-[10px] text-white/40 font-medium italic">Access expires in 24 hours · You can revoke at any time from your Access Center</p>
           </div>
           <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-2xl border border-white/10 text-xs font-black text-white/60 hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={() => onConfirm(selectedCats)}
                className="px-8 py-3 rounded-2xl bg-white text-black text-xs font-black hover:bg-white/90 transition-all uppercase tracking-widest shadow-xl shadow-white/5"
              >
                Confirm & share
              </button>
           </div>
        </GlassCard>
      </div>

    </motion.div>
  )
}
