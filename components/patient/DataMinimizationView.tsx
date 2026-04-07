'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Check, 
  ShieldCheck, 
  Clock, 
  Calendar,
  Lock,
  ChevronRight,
  ChevronLeft,
  Activity,
  Heart,
  Pill,
  ClipboardList,
  AlertCircle,
  FileText,
  BadgeCheck,
  Eye,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinicalStore } from '@/store/useClinicalStore'
import { categorizeRecord, getRecommendedSystemsBySpecialty, type BodySystem } from '@/lib/ai-categorize'
import type { AccessRequest } from '@/lib/types'

interface DataMinimizationViewProps {
  request: AccessRequest
  onClose: () => void
  onConfirm: (payload: {
    duration: number;
    historyLimit: number;
    shieldActive: boolean;
    systems: BodySystem[];
  }) => void
}

const SYSTEMS: { id: BodySystem; label: string; icon: string }[] = [
  { id: 'Heart', label: 'Cardio', icon: '❤' },
  { id: 'Bones', label: 'Ortho', icon: '🦴' },
  { id: 'Mental', label: 'Mental', icon: '🧠' },
  { id: 'Lungs', label: 'Respiratory', icon: '🫁' },
  { id: 'Digestive', label: 'Digestive', icon: '🍕' },
  { id: 'Blood', label: 'Hematology', icon: '🩸' },
  { id: 'Brain', label: 'Neurology', icon: '⚡' },
  { id: 'Skin', label: 'Dermatology', icon: '🧴' },
  { id: 'General', label: 'General', icon: '📄' }
]

const DURATION_OPTIONS = [
  { label: '15 Mins', value: 900, icon: Clock },
  { label: '1 Hour', value: 3600, icon: Clock },
  { label: '24 Hours', value: 86400, icon: Clock },
  { label: '7 Days', value: 604800, icon: Calendar },
  { label: '30 Days', value: 2592000, icon: Calendar }
]

const HISTORY_OPTIONS = [
  { label: '6 Months', value: 6 },
  { label: '1 Year', value: 12 },
  { label: '3 Years', value: 36 },
  { label: '5 Years', value: 60 },
  { label: 'All History', value: 999 }
]

export function DataMinimizationView({ request, onClose, onConfirm }: DataMinimizationViewProps) {
  const [step, setStep] = useState(1)
  const [duration, setDuration] = useState(3600) // 1h default
  const [historyLimit, setHistoryLimit] = useState(12) // 1 year default
  const [shieldActive, setShieldActive] = useState(true)
  
  // AI DECIDES: Pre-select systems based on specialization
  const recommendedSystems = useMemo(() => 
    getRecommendedSystemsBySpecialty(request.doctorSpecialty || ''), 
    [request.doctorSpecialty]
  )
  const [selectedSystems, setSelectedSystems] = useState<BodySystem[]>(recommendedSystems)
  const [isAiRecommended, setIsAiRecommended] = useState(true)
  
  const { 
    vitals, conditions, medications, allergies, attachments, 
    clinicalNotes, medicalImages 
  } = useClinicalStore()

  // 1. Aggregate All Records with BodySystem tagging
  const allRecords = useMemo(() => {
    const list: any[] = []
    
    const wrap = (r: any, type: string, title: string, date: string, subtitle?: string) => ({
      ...r,
      id: r.id || `${type}-${Math.random()}`,
      resourceType: type,
      title,
      subtitle,
      date,
      bodySystem: categorizeRecord(title, subtitle || '').system,
      isSensitive: (subtitle || '').toLowerCase().includes('sensitive') || (title || '').toLowerCase().includes('sensitive')
    })

    conditions.forEach(r => {
        const title = r.code?.text || 'Condition'
        list.push(wrap(r, 'Condition', title, r.recordedDate || ''))
    })
    medications.forEach(r => {
        const title = r.medicationCodeableConcept?.text || 'Medication'
        list.push(wrap(r, 'MedicationRequest', title, r.authoredOn || ''))
    })
    attachments.forEach(r => {
        list.push(wrap(r, 'DiagnosticReport', r.fileName, r.uploadedAt, r.description))
    })
    clinicalNotes.forEach(r => {
        list.push(wrap(r, 'ClinicalNote', 'Visit Note', r.timestamp, r.content.substring(0, 40)))
    })
    vitals.forEach(r => {
        list.push(wrap(r, 'Observation', r.type, r.readings?.[0]?.timestamp || '', `${r.latestValue} ${r.unit}`))
    })
    medicalImages.forEach(r => {
        list.push(wrap(r, 'DiagnosticReport', r.type || 'Medical Image', r.timestamp, r.description))
    })

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [conditions, medications, attachments, clinicalNotes, vitals, medicalImages])

  // 2. Filter Records based on Current Wizard State
  const manifest = useMemo(() => {
    return allRecords.filter(r => {
      // System Filter
      if (!selectedSystems.includes(r.bodySystem)) return false
      
      // History Filter
      if (historyLimit !== 999) {
        const limitDate = new Date()
        limitDate.setMonth(limitDate.getMonth() - historyLimit)
        if (new Date(r.date) < limitDate) return false
      }
      
      // Shield Filter (Exclude Sensitive)
      if (shieldActive && r.isSensitive) return false
      
      return true
    })
  }, [allRecords, selectedSystems, historyLimit, shieldActive])

  const stats = {
    shared: manifest.length,
    total: allRecords.length,
    withheld: allRecords.length - manifest.length,
    exposure: allRecords.length > 0 ? Math.round((manifest.length / allRecords.length) * 100) : 0
  }

  const handleNext = () => setStep(s => Math.min(s + 1, 6))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const toggleSystem = (id: BodySystem) => {
    setIsAiRecommended(false)
    setSelectedSystems(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0d1117] flex flex-col items-center justify-center p-4 md:p-8"
    >
        {/* Modal Window */}
        <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#21262d]">
                <motion.div 
                    className="h-full bg-[#238636]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / 6) * 100}%` }}
                />
            </div>

            {/* Header */}
            <div className="px-8 pt-10 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.2em]">Step {step} of 6</span>
                    <span className="w-1 h-1 rounded-full bg-[#30363d]" />
                    <span className="text-[10px] font-black text-[#238636] uppercase tracking-[0.2em]">
                        {step === 1 && "Identity"}
                        {step === 2 && "Duration"}
                        {step === 3 && "History"}
                        {step === 4 && "Privacy"}
                        {step === 5 && "Scope"}
                        {step === 6 && "Manifest"}
                    </span>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#21262d] flex items-center justify-center hover:bg-[#30363d] transition-colors">
                    <X className="w-4 h-4 text-[#8b949e]" />
                </button>
            </div>

            {/* Slides Container */}
            <div className="flex-1 overflow-y-auto px-8 pb-32 scrollbar-hide">
                <AnimatePresence mode="wait">
                    
                    {/* SLIDE 1: Role Verification (Matches Architecture Diagram) */}
                    {step === 1 && (
                        <motion.div 
                            key="s1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Role Verification Logic</h2>
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">Identity Handshake</h3>
                                <p className="text-sm text-[#8b949e]">Verifying clinician role & license context.</p>
                            </div>

                            <div className="p-8 rounded-[32px] bg-[#0d1117] border border-[#30363d] flex flex-col items-center gap-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#238636]/10 border border-[#238636]/20 rounded-full">
                                        <BadgeCheck className="w-3.5 h-3.5 text-[#238636]" />
                                        <span className="text-[9px] font-black text-[#238636] uppercase tracking-widest leading-none">Verified Role</span>
                                    </div>
                                </div>

                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent flex items-center justify-center border border-white/5 shadow-2xl relative">
                                    <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors" />
                                    <span className="text-3xl font-black text-white/90 relative z-10">{request.doctorName[0]}</span>
                                </div>

                                <div className="text-center space-y-1 relative z-10">
                                    <h3 className="text-xl font-bold text-white tracking-tight">{request.doctorName}</h3>
                                    <p className="text-xs text-[#8b949e] font-medium mb-2">{request.organization}</p>
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{request.doctorSpecialty}</span>
                                    </div>
                                </div>

                                <div className="w-full pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-[#8b949e] uppercase tracking-widest">Protocol</p>
                                        <p className="text-[10px] font-bold text-white">OAuth 2.0 / EHR-S</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[8px] font-black text-[#8b949e] uppercase tracking-widest">Trust Index</p>
                                        <p className="text-[10px] font-bold text-[#238636]">100% SECURE</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 rounded-[24px] bg-[#238636]/5 border border-[#238636]/20 space-y-3 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#238636]/5 rounded-full blur-3xl" />
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-[#238636]" />
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Clinical Intent</h4>
                                </div>
                                <p className="text-xs text-white/70 leading-relaxed font-medium italic relative z-10">
                                    "{request.reason || 'Primary clinical consultation and diagnostic review.'}"
                                </p>
                            </div>

                            <p className="text-[9px] text-center text-[#8b949e]/40 font-black uppercase tracking-[0.2em]">
                                All decisions are logged to the Blockchain Audit Trail
                            </p>
                        </motion.div>
                    )}

                    {/* SLIDE 2: Duration */}
                    {step === 2 && (
                        <motion.div 
                            key="s2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Access Duration</h2>
                                <p className="text-sm text-[#8b949e]">How long will the doctor have access?</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {DURATION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setDuration(opt.value)}
                                        className={cn(
                                            "flex items-center justify-between p-5 rounded-2xl border transition-all",
                                            duration === opt.value 
                                                ? "bg-[#238636]/10 border-[#238636] text-white" 
                                                : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <opt.icon className={cn("w-5 h-5", duration === opt.value ? "text-[#238636]" : "text-[#484f58]")} />
                                            <span className="text-sm font-bold uppercase tracking-wider">{opt.label}</span>
                                        </div>
                                        {duration === opt.value && <div className="w-2 h-2 rounded-full bg-[#238636] shadow-[0_0_10px_#238636]" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* SLIDE 3: History */}
                    {step === 3 && (
                        <motion.div 
                            key="s3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Temporal Depth</h2>
                                <p className="text-sm text-[#8b949e]">Limit sharing to recent records only.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {HISTORY_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setHistoryLimit(opt.value)}
                                        className={cn(
                                            "flex items-center justify-between p-5 rounded-2xl border transition-all",
                                            historyLimit === opt.value 
                                                ? "bg-[#5B8DEF]/10 border-[#5B8DEF] text-white" 
                                                : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <Calendar className={cn("w-5 h-5", historyLimit === opt.value ? "text-[#5B8DEF]" : "text-[#484f58]")} />
                                            <span className="text-sm font-bold uppercase tracking-wider">{opt.label}</span>
                                        </div>
                                        {historyLimit === opt.value && <div className="w-2 h-2 rounded-full bg-[#5B8DEF] shadow-[0_0_10px_#5B8DEF]" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* SLIDE 4: Privacy Shield */}
                    {step === 4 && (
                        <motion.div 
                            key="s4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Privacy Shield</h2>
                                <p className="text-sm text-[#8b949e]">Hide highly sensitive records from view.</p>
                            </div>

                            <div className="p-8 rounded-[32px] bg-[#0d1117] border border-[#30363d] text-center space-y-6">
                                <div className={cn(
                                    "w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all duration-500",
                                    shieldActive ? "bg-amber-500/20 text-amber-500 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)]" : "bg-white/5 text-[#484f58]"
                                )}>
                                    <Lock className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white">{shieldActive ? 'Shield Active' : 'Shield Inactive'}</h3>
                                    <p className="text-xs text-[#8b949e] max-w-[240px] mx-auto leading-relaxed">
                                        When active, records containing psychiatric notes, HIV/STI results, or explicitly sensitive tags are automatically sanitized.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShieldActive(!shieldActive)}
                                    className={cn(
                                        "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border",
                                        shieldActive 
                                            ? "bg-amber-500 text-black border-amber-500" 
                                            : "bg-transparent border-[#30363d] text-[#8b949e] hover:border-white/10"
                                    )}
                                >
                                    {shieldActive ? 'Disable Shield' : 'Enable Shield'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* SLIDE 5: Resource Scope */}
                    {step === 5 && (
                        <motion.div 
                            key="s5"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Resource Scope</h2>
                                <p className="text-sm text-[#8b949e]">Select which body systems to share.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {SYSTEMS.map(sys => (
                                    <button
                                        key={sys.id}
                                        onClick={() => toggleSystem(sys.id)}
                                        className={cn(
                                            "p-5 rounded-[24px] border transition-all text-left group",
                                            selectedSystems.includes(sys.id)
                                                ? "bg-white/[0.05] border-white/20" 
                                                : "bg-[#0d1117] border-[#30363d] opacity-40 grayscale"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xl group-hover:scale-110 transition-transform">{sys.icon}</span>
                                            <div className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                selectedSystems.includes(sys.id) ? "bg-[#238636] border-[#238636]" : "bg-transparent border-[#30363d]"
                                            )}>
                                                {selectedSystems.includes(sys.id) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>
                                        <h4 className="text-xs font-bold text-white leading-none">{sys.label}</h4>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* SLIDE 6: Manifest */}
                    {step === 6 && (
                        <motion.div 
                            key="s6"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Sharing Manifest</h2>
                                <p className="text-sm text-[#8b949e]">Review final list of itemized files.</p>
                            </div>

                             <div className="flex items-center justify-between border-b border-[#30363d] pb-6 mb-6">
                                <div className="text-center flex-1 border-r border-[#30363d]">
                                    <p className="text-[9px] font-bold text-[#8b949e] uppercase tracking-widest mb-1">Granting</p>
                                    <p className="text-xl font-bold text-white">{stats.shared} files</p>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-[9px] font-bold text-[#8b949e] uppercase tracking-widest mb-1">Exposure</p>
                                    <p className={cn("text-xl font-bold", stats.exposure > 50 ? "text-orange-500" : "text-[#238636]")}>{stats.exposure}%</p>
                                </div>
                             </div>

                             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                {manifest.length > 0 ? (
                                    manifest.map((r, i) => (
                                        <div key={r.id || i} className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg opacity-50">{categorizeRecord(r.title).icon}</span>
                                                <div>
                                                    <h4 className="text-[11px] font-bold text-white truncate max-w-[180px]">{r.title}</h4>
                                                    <p className="text-[9px] text-[#8b949e] uppercase font-black tracking-tighter">{new Date(r.date).toLocaleDateString()} · {r.bodySystem}</p>
                                                </div>
                                            </div>
                                            <Eye className="w-3.5 h-3.5 text-[#238636] opacity-50" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-[#8b949e]">
                                        <Zap className="w-8 h-8 mx-auto mb-4 opacity-20" />
                                        <p className="text-xs italic">No records match your selected filters.</p>
                                    </div>
                                )}
                             </div>

                             <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-center">
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Signed & Encrypted by MedVault Identity</p>
                             </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Persistent Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 bg-gradient-to-t from-[#161b22] via-[#161b22] to-transparent">
                <div className="flex items-center gap-3">
                    {step > 1 && (
                        <button 
                            onClick={handleBack}
                            className="flex-1 py-4 rounded-2xl bg-[#0d1117] border border-[#30363d] text-xs font-black text-white hover:bg-[#21262d] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                    )}
                    
                    {step < 6 ? (
                        <button 
                            onClick={handleNext}
                            className="flex-[2] py-4 rounded-2xl bg-white text-black text-xs font-black hover:bg-[#f0f0f0] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => onConfirm({ duration, historyLimit, shieldActive, systems: selectedSystems })}
                            className="flex-[2] py-4 rounded-2xl bg-[#238636] text-white text-xs font-black hover:bg-[#2ea043] transition-all uppercase tracking-widest shadow-xl shadow-[#238636]/20 flex items-center justify-center gap-2"
                        >
                            Grant Authorization <Zap className="w-4 h-4" />
                        </button>
                    ) }
                </div>
            </div>
        </div>
    </motion.div>
  )
}
