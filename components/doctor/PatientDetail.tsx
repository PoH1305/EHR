'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Edit3, FileText, TrendingUp, AlertCircle, Loader2, Upload, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinicalStore } from '@/store/useClinicalStore'
import { AddPrescriptionModal } from './AddPrescriptionModal'
import { AddNoteModal } from './AddNoteModal'
import FileUploadModal from './FileUploadModal'
import { ClinicalCoPilot } from './ClinicalCoPilot'

interface PatientDetailProps {
  onBack: () => void
  patientId?: string
}

export default function PatientDetail({ onBack, patientId = 'pat-001' }: PatientDetailProps) {
  const { vitals, loadClinicalData, isLoading, isEmergencyMode } = useClinicalStore()
  const [activeTab, setActiveTab] = useState<'RECORDS' | 'COPILOT'>('RECORDS')
  const [showPrescribe, setShowPrescribe] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [, setRefreshAttachments] = useState(0)

  useEffect(() => {
    void loadClinicalData(patientId)
  }, [patientId, loadClinicalData])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="w-10 h-10 text-[#5B8DEF] animate-spin" />
           <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">Synchronizing Clinical Node</p>
        </div>
      </div>
    )
  }
  if (isEmergencyMode) {
    return (
      <div className="animate-in fade-in duration-700 pb-24 space-y-8">
        {/* Tactical Header */}
        <div className="flex items-center justify-between sticky top-0 z-50 bg-red-950/40 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-red-500/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tighter">Emergency Tactical View</h1>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Immediate Life-Critical Access</p>
            </div>
          </div>
          <button 
            onClick={onBack}
            className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
          >
            Exit Tactical
          </button>
        </div>

        {/* Critical Patient Info */}
        <div className="bg-red-950/10 border border-red-500/20 p-8 rounded-[40px] flex items-center gap-8 relative overflow-hidden">
           <div className="w-24 h-24 rounded-[32px] bg-red-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
              PN
           </div>
           <div>
              <h2 className="text-4xl font-black text-white tracking-tighter" data-privacy="true">Priya Nair</h2>
              <div className="flex items-center gap-4 mt-2">
                 <span className="text-xs font-bold text-red-500 uppercase tracking-widest">34F • B+ • Bangalore</span>
                 <div className="w-1 h-1 rounded-full bg-red-500 opacity-20" />
                 <span className="text-xs font-mono text-red-500/60 uppercase">Protocol 9-Alpha Active</span>
              </div>
           </div>
           <div className="absolute top-0 right-0 p-8">
              <div className="flex flex-col items-end">
                 <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Guardian Pulse</span>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-widest">Secure Access</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Life-Saving Intel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           {/* Focus 1: Critical Vitals */}
           <div className="md:col-span-8 space-y-6">
              <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-red-500/40 ml-1">Live Telemetry</h3>
              <div className="grid grid-cols-2 gap-4">
                 {vitals.map((v) => (
                    <div key={v.type} className="bg-red-500/5 border border-red-500/10 p-8 rounded-[36px] relative overflow-hidden group">
                       <p className="text-[10px] uppercase font-bold text-red-500/40 tracking-widest mb-2">{v.type}</p>
                       <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-white tracking-tighter">{v.latestValue}</span>
                          <span className="text-xs font-bold text-red-500/40">{v.unit}</span>
                       </div>
                       <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                          <TrendingUp className="w-12 h-12 text-red-500" />
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Focus 2: Blockers (Allergies/Medications) */}
           <div className="md:col-span-4 space-y-6">
              <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-red-500/40 ml-1">Critical Blockers</h3>
              <div className="space-y-4">
                 <div className="bg-red-600/10 border border-red-600/20 p-6 rounded-[32px] space-y-3 animate-pulse">
                    <div className="flex items-center gap-2">
                       <AlertCircle className="w-4 h-4 text-red-600" />
                       <span className="text-xs font-black text-red-600 uppercase tracking-widest">Severe Allergies</span>
                    </div>
                    <p className="text-lg font-black text-white tracking-tight">Penicillin, Peanuts</p>
                 </div>

                 <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-3">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Active Medications</span>
                    <ul className="space-y-2">
                       <li className="text-xs font-medium text-white/60 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                          Telmisartan 40mg
                       </li>
                       <li className="text-xs font-medium text-white/60 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                          Metformin 500mg
                       </li>
                    </ul>
                 </div>
              </div>
           </div>
        </div>

        {/* Focused Clinical Context */}
        <div className="space-y-6">
           <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-red-500/40 ml-1">Recent Context</h3>
           <div className="bg-[#111827]/40 border border-white/[0.05] p-8 rounded-[40px] relative">
              <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white/40" />
                 </div>
                 <div className="flex-1">
                    <p className="text-sm font-medium text-white/80 leading-relaxed italic">
                       &quot;Patient has a history of hypertensive crisis. Avoid NSAIDs if possible. Last discharge summary notes significant renal sensitivity.&quot;
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Source: Discharge Summary (2024)</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-24 space-y-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-[#0d1117]/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Back</span>
        </button>
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           <span className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em]">High Alert</span>
        </div>
      </div>

      {/* Patient Profile Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4">
        <div className="flex items-center gap-6">
          <div className="relative">
             <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-[#1A3A8F] to-[#5B8DEF] p-[1px] shadow-2xl shadow-[#5B8DEF]/20">
               <div className="w-full h-full rounded-[31px] bg-[#0d1117] flex items-center justify-center text-2xl font-bold text-white">
                 PN
               </div>
             </div>
             <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-[#0d1117] flex items-center justify-center shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
             </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">Priya Nair</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
               <span className="text-[10px] text-[#5B8DEF] font-bold font-mono tracking-tighter bg-[#5B8DEF]/10 border border-[#5B8DEF]/20 px-2.5 py-1 rounded-lg">ID: {patientId}</span>
               <span className="text-xs text-white/30 font-medium tracking-tight bg-white/5 px-2.5 py-1 rounded-lg">34F • B Positive • Bangalore</span>
            </div>
          </div>
        </div>
        
         <div className="flex gap-2 overflow-x-auto pb-8 -mb-8 no-scrollbar scroll-smooth relative z-40">
            <button 
              onClick={() => {
                console.log('Switching to RECORDS');
                setActiveTab('RECORDS');
              }}
              className={cn(
                "flex-none px-6 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group",
                activeTab === 'RECORDS' 
                  ? "bg-[#5B8DEF]/20 text-white border border-[#5B8DEF]/40 shadow-lg shadow-[#5B8DEF]/10" 
                  : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10"
              )}
            >
               <FileText className={cn("w-4 h-4", activeTab === 'RECORDS' ? "text-[#5B8DEF]" : "text-white/40")} />
               <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">Records</span>
            </button>
            <button 
              onClick={() => {
                console.log('Switching to COPILOT');
                setActiveTab('COPILOT');
              }}
              className={cn(
                "flex-none px-6 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group",
                activeTab === 'COPILOT' 
                  ? "bg-white/10 text-white border border-white/20 shadow-lg shadow-white/5" 
                  : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10"
              )}
            >
               <Sparkles className={cn("w-4 h-4", activeTab === 'COPILOT' ? "text-[#5B8DEF]" : "text-white/40")} />
               <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">Copilot</span>
            </button>
            <div className="w-[1px] h-10 bg-white/10 mx-2 self-center hidden sm:block shrink-0" />
            <button 
              onClick={() => setShowPrescribe(true)}
              className="flex-none px-6 py-4 bg-[#5B8DEF] hover:bg-[#5B8DEF]/90 text-white rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#5B8DEF]/20 group"
            >
               <Edit3 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
               <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">Prescribe</span>
            </button>
            <button 
              onClick={() => setShowNote(true)}
              className="flex-none px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group"
            >
               <FileText className="w-4 h-4 text-white/40 group-hover:text-white" />
               <span className="text-[11px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white whitespace-nowrap">Note</span>
            </button>
            <button 
              onClick={() => setShowUpload(true)}
              className="flex-none px-6 py-4 bg-[#5B8DEF]/10 hover:bg-[#5B8DEF]/20 border border-[#5B8DEF]/20 text-[#5B8DEF] rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group"
            >
               <Upload className="w-4 h-4" />
               <span className="text-[11px] font-bold uppercase tracking-widest text-[#5B8DEF] whitespace-nowrap">Upload</span>
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in duration-700">
        {activeTab === 'COPILOT' ? (
          <div className="space-y-6">
             <div className="flex items-center gap-2 ml-1">
                <Sparkles className="w-4 h-4 text-[#5B8DEF]" />
                <h2 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/20">Clinical Intelligence Analysis</h2>
             </div>
             <ClinicalCoPilot patientId={patientId} patientName="Priya Nair" />
          </div>
        ) : (
          <div className="max-w-4xl">
             {/* Center: Conditions */}
             <div className="space-y-6">
                <div className="flex items-center justify-between ml-1">
                   <h2 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/20">Active Conditions</h2>
                   <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">2 Active</span>
                </div>
                <div className="bg-[#111827]/40 border border-white/[0.05] rounded-3xl p-8 space-y-4 shadow-xl">
                   {[
                     { name: "Hypertension", since: "2022", color: "red" },
                     { name: "Type 2 Diabetes", since: "2023", color: "orange" },
                   ].map((c) => (
                     <div key={c.name} className={cn(
                       "p-6 rounded-2xl border flex items-center justify-between group hover:scale-[1.01] transition-all",
                       c.color === 'red' ? "bg-red-500/5 border-red-500/10" : "bg-orange-500/5 border-orange-500/10"
                     )}>
                        <span className={cn("text-lg font-bold", c.color === 'red' ? "text-red-500/80" : "text-orange-500/80")}>{c.name}</span>
                        <span className="text-[10px] font-bold text-white/10 uppercase tracking-[0.2em]">Since {c.since}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddPrescriptionModal 
        isOpen={showPrescribe}
        onClose={() => setShowPrescribe(false)}
        patientId={patientId}
        patientName="Priya Nair"
      />
      <AddNoteModal
        isOpen={showNote}
        onClose={() => setShowNote(false)}
        patientId={patientId}
        patientName="Priya Nair"
      />
      <FileUploadModal 
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false)
          setRefreshAttachments(prev => prev + 1)
        }}
        patientId={patientId}
      />
    </div>
  )
}
