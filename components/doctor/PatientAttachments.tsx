'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Trash2, Calendar, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { useToast } from '@/store/useToast'
import { Skeleton } from '@/components/ui/Skeleton'
import type { PatientAttachment } from '@/lib/types'

interface PatientAttachmentsProps {
  patientId: string
  refreshTrigger: number
}

export default function PatientAttachments({ patientId, refreshTrigger }: PatientAttachmentsProps) {
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<PatientAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<PatientAttachment['category'] | 'ALL'>('ALL')

  useEffect(() => {
    async function loadAttachments() {
      if (!db) return
      setIsLoading(true)
      try {
        const data = await db.patient_attachments
          .where('patientId')
          .equals(patientId)
          .reverse()
          .sortBy('uploadedAt')
        setAttachments(data)
      } catch (error) {
        console.error('Failed to load attachments:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadAttachments()
  }, [patientId, refreshTrigger])

  const deleteAttachment = async (id: string, fileName: string) => {
    if (!db || !confirm(`Delete "${fileName}"?`)) return
    try {
      await db.patient_attachments.delete(id)
      setAttachments(prev => prev.filter(a => a.id !== id))
      toast("Attachment removed", "success")
    } catch {
      toast("Failed to delete", "error")
    }
  }

  const downloadAttachment = (base64Url: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = base64Url
    link.download = fileName
    link.click()
    toast("Download started", "success")
  }

  const filtered = filter === 'ALL' 
    ? attachments 
    : attachments.filter(a => a.category === filter)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-3xl bg-white/[0.03]" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 overflow-x-auto no-scrollbar max-w-full">
          {(['ALL', 'LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'OTHER'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "whitespace-nowrap px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                filter === cat 
                  ? "bg-blue-500 text-white" 
                  : "text-white/20 hover:text-white/40"
              )}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-[32px] border border-dashed border-white/5"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <HardDrive className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-sm font-bold text-white/20 uppercase tracking-widest">No documents found</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group p-5 bg-white/[0.03] border border-white/[0.05] rounded-[28px] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />

                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                    doc.category === 'LAB_REPORT' ? "bg-purple-500/10 text-purple-400" :
                    doc.category === 'PRESCRIPTION' ? "bg-green-500/10 text-green-400" :
                    doc.category === 'DISCHARGE_SUMMARY' ? "bg-orange-500/10 text-orange-400" :
                    "bg-blue-500/10 text-blue-400"
                  )}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => downloadAttachment(doc.fileUrl, doc.fileName)}
                      className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteAttachment(doc.id, doc.fileName)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white truncate pr-4">{doc.fileName}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <span>{doc.category.replace('_', ' ')}</span>
                    <span className="w-1 h-1 rounded-full bg-white/5" />
                    <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                  </div>
                </div>

                {doc.description && (
                  <p className="mt-3 text-[11px] text-white/40 leading-relaxed line-clamp-2 italic">
                    {doc.description}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-black text-white/20 tracking-tighter uppercase">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    Local Node
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
