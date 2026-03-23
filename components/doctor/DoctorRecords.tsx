'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2, FileText, Pill, Calendar, User } from 'lucide-react'
import { useClinicalStore } from '@/store/useClinicalStore'

interface DoctorRecordsProps {
  patientId?: string | null
}

export default function DoctorRecords({ patientId }: DoctorRecordsProps) {
  const [activeTab, setActiveTab] = useState('Prescriptions')
  const { 
    medications, 
    clinicalNotes, 
    isLoading, 
    loadClinicalData,
    loadPatientMetadata,
    selectedPatientProfile 
  } = useClinicalStore()

  useEffect(() => {
    if (patientId) {
      void loadClinicalData(patientId)
      void loadPatientMetadata(patientId)
    }
  }, [patientId, loadClinicalData, loadPatientMetadata])

  const prescriptions = medications.map(m => ({
    id: m.id,
    name: m.medicationCodeableConcept?.text || 'Unknown Medication',
    status: m.status === 'active' ? 'Active' : 'Completed',
    dose: m.dosageInstruction?.[0]?.text || '',
    meta: `Authored: ${new Date(m.authoredOn || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }))

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#5B8DEF]/10 flex items-center justify-center text-lg font-bold text-[#5B8DEF]">
               {selectedPatientProfile?.name?.[0] || 'P'}
            </div>
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">{selectedPatientProfile?.name || 'Patient'}</h1>
               <div className="text-[10px] text-white/20 tracking-[0.2em] font-bold uppercase mt-0.5">Clinical History • {selectedPatientProfile?.location || 'Remote'}</div>
            </div>
         </div>
      </div>

      <div className="flex border-b border-white/5 pb-0.5 gap-8">
        {['Prescriptions', 'Clinical Notes', 'Labs'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] pb-3 transition-all relative",
              activeTab === tab ? "text-[#5B8DEF]" : "text-white/20 hover:text-white/40"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="doctor-records-tabs"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B8DEF] shadow-[0_0_10px_rgba(91,141,239,0.5)]" 
              />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#5B8DEF] animate-spin" />
            </div>
          ) : activeTab === 'Prescriptions' ? (
            <motion.div 
              key="prescriptions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
               {prescriptions.length > 0 ? prescriptions.map((p, i) => (
                <div key={p.id || i} className="bg-[#111827]/40 border border-white/[0.03] p-5 rounded-3xl group hover:bg-[#111827]/60 transition-all border-b-2 border-b-white/5">
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Pill className="w-4 h-4 text-blue-400" />
                         </div>
                         <span className="text-sm font-bold text-white tracking-tight">{p.name}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/5",
                        p.status === 'Active' ? "bg-green-500/10 text-green-500" : "bg-white/5 text-white/20"
                      )}>
                        {p.status}
                      </span>
                   </div>
                   <p className="text-xs text-white/50 leading-relaxed font-medium mb-3">{p.dose}</p>
                   <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest">{p.meta}</div>
                      <button className="text-[9px] font-bold text-[#5B8DEF] uppercase tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Renew</button>
                   </div>
                </div>
               )) : (
                 <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <Pill className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">No active prescriptions</p>
                 </div>
               )}
            </motion.div>
          ) : activeTab === 'Clinical Notes' ? (
            <motion.div 
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
               {clinicalNotes.length > 0 ? clinicalNotes.map((note, i) => (
                <div key={note.id || i} className="bg-[#111827]/40 border border-white/[0.03] p-6 rounded-3xl relative overflow-hidden group">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-indigo-400" />
                         </div>
                         <div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">{note.type.replace('_', ' ')}</span>
                            <span className="text-xs text-white/30 font-bold uppercase tracking-tighter">{new Date(note.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                         </div>
                      </div>
                   </div>
                   <p className="text-sm text-white/60 leading-relaxed font-medium mb-4 whitespace-pre-wrap">
                      {note.content}
                   </p>
                   {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                         {note.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">#{tag}</span>
                         ))}
                      </div>
                   )}
                   <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                      <User className="w-3 h-3 text-white/20" />
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{note.doctorName}</span>
                   </div>
                </div>
               )) : (
                 <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <FileText className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">No clinical notes recorded</p>
                 </div>
               )}
            </motion.div>
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
               <Calendar className="w-8 h-8 text-white/10 mx-auto mb-3" />
               <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">No lab records found</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
