'use client'

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, FileText, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { useToast } from '@/store/useToast'
import { useClinicalStore } from '@/store/useClinicalStore'
import type { PatientAttachment } from '@/lib/types'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
}

export default function FileUploadModal({ isOpen, onClose, patientId }: FileUploadModalProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<PatientAttachment['category']>('LAB_REPORT')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const { addAttachment } = useClinicalStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) { // 10MB limit
        toast("File size exceeds 10MB limit", "error")
        return
      }
      setFile(selected)
    }
  }

  const uploadFile = async () => {
    if (!file || !db) return
    setIsUploading(true)

    try {
      // Create a local blob URL for the addAttachment flow
      const fileUrl = URL.createObjectURL(file)

      const attachment: PatientAttachment = {
        id: Math.random().toString(36).substring(2, 11),
        patientId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        category,
        description: description || undefined
      }

      // Use clinical store action - handles cloud upload and sync
      await addAttachment(attachment)
      
      toast("File uploaded successfully and synced to patient", "success")
      setFile(null)
      setDescription('')
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
      toast("Upload failed. Please try again.", "error")
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0d1117]/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-[#161b22] border border-white/[0.05] rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="px-8 py-6 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Clinical Upload</h3>
              <p className="text-xs text-white/40 font-medium">Secure local attachment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Dropzone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-[24px] p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
              file ? "border-green-500/20 bg-green-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {file ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white truncate max-w-[240px]">{file.name}</p>
                  <p className="text-xs text-white/40 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-sm font-bold text-white/40">Drop file here or click to browse</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1 mb-2 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {(['LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'OTHER'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border text-[10px] font-bold tracking-wider transition-all",
                      category === cat 
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                        : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                    )}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1 mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this document..."
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-white/10 h-24 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-white/[0.02] flex items-center justify-between">
          <p className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-wider">
            <ShieldAlert className="w-3 h-3" />
            E2E Encrypted Record
          </p>
          <button
            onClick={uploadFile}
            disabled={!file || isUploading}
            className={cn(
              "px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2",
              !file ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-[#5B8DEF] text-white hover:bg-[#5B8DEF]/90 shadow-xl shadow-blue-500/20"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Confirm Upload
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}
