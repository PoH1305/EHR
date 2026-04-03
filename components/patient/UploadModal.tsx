'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Upload, 
  FileText, 
  Pill, 
  ClipboardList, 
  Activity, 
  Image as ImageIcon,
  ShieldCheck,
  PlusCircle,
  FileBadge
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (data: { category: string; description: string; file: File }) => Promise<void>
  selectedFile: File | null
}

const CATEGORIES = [
  { id: 'LAB_REPORT', label: 'Lab Report', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'PRESCRIPTION', label: 'Prescription', icon: Pill, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'DISCHARGE_SUMMARY', label: 'Discharge Summary', icon: ClipboardList, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'CLINICAL_NOTE', label: 'Clinical Note', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'IMAGE_REPORT', label: 'Image Report', icon: ImageIcon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'INSURANCE_DOC', label: 'Insurance Document', icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'OTHER', label: 'Other Record', icon: FileBadge, color: 'text-slate-500', bg: 'bg-slate-500/10' },
]

export function UploadModal({ isOpen, onClose, onUpload, selectedFile }: UploadModalProps) {
  const [category, setCategory] = useState('LAB_REPORT')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      await onUpload({ category, description, file: selectedFile })
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen || !selectedFile) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#0d1117] border border-white/10 rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Upload className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Categorize Record</h2>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Secure Vault Upload</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {/* File Info Card */}
            <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 border border-white/10">
                <FileBadge className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Unknown Type'}
                </p>
              </div>
            </div>

            {/* Category Grid */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Select Record Category</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = category === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex items-center gap-3 text-left",
                        isSelected 
                          ? cn("bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10") 
                          : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-blue-400" : cat.color)} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Optional Note</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Annual health checkup, Blood panel..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-8 pt-0 mt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isUploading}
              className="flex-[2] py-4 rounded-2xl bg-blue-500 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <PlusCircle className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              {isUploading ? 'Securing...' : 'Seal in Vault'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
