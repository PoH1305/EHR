'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertOctagon } from 'lucide-react'
import { PinUnlock } from './PinUnlock'

interface SecurityAlertModalProps {
  isOpen: boolean
  onUnlock: () => void
}

export function SecurityAlertModal({ isOpen, onUnlock }: SecurityAlertModalProps) {
  // Lock background scroll and prevent escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-red-500/20 backdrop-blur-md" />

      {/* Alert card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: [0, -12, 12, -12, 12, -8, 8, 0],
        }}
        transition={{
          scale: { duration: 0.3 },
          x: { duration: 0.6, delay: 0.3 },
        }}
        className="relative glass-card rounded-3xl w-full max-w-md p-8 border-2 border-red-500 animate-pulse"
      >
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertOctagon className="w-8 h-8 text-red-500" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-red-500 mb-2">
              Unauthorized Access Detected
            </h2>
            <p className="text-sm text-foreground/50">
              Your health identity has been locked. PIN verification required.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-foreground/5">
            <PinUnlock onSuccess={onUnlock} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
