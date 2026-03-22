'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, Clock, Calendar, Activity } from 'lucide-react'

import { useClinicalStore } from '@/store/useClinicalStore'

interface AISummaryModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
}

export function AISummaryModal({ isOpen, onClose }: AISummaryModalProps) {
  const [mounted, setMounted] = useState(false)
  const { conditions } = useClinicalStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative glass-card rounded-3xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">Clinical Summary</h2>
                <p className="text-xs text-foreground/50 mt-0.5">AI-powered health overview</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-full text-foreground/50 hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {conditions.length > 0 ? (
              conditions.map((condition) => (
                <div key={condition.id} className="p-4 rounded-2xl bg-foreground/[0.03] border border-foreground/5 hover:bg-foreground/[0.05] transition-colors">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {condition.code?.text || 'Unknown Condition'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-violet-400 bg-violet-500/10 px-2 py-1 rounded-md">
                      <Calendar className="w-3 h-3" />
                      {condition.recordedDate ? new Date(condition.recordedDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-foreground/70">
                      <Clock className="w-3.5 h-3.5 text-foreground/40" />
                      <span>Status: {condition.clinicalStatus?.coding?.[0]?.code || 'Active'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <FileText className="w-10 h-10 text-foreground/10" />
                <div>
                  <p className="text-sm font-medium text-foreground/60">No clinical records found</p>
                  <p className="text-[10px] text-foreground/30 mt-1">
                    Inject your medical records to see an AI-generated summary here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  )
}
