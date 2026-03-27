'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Phone, ShieldCheck, User } from 'lucide-react'
import { cn, formatHealthId } from '@/lib/utils'
import type { PatientProfile } from '@/lib/types'

interface HealthIdentityCardProps {
  patient: PatientProfile
}

export function HealthIdentityCard({ patient }: HealthIdentityCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const qrValue = `ehi://connect?healthId=${patient.healthId}&name=${encodeURIComponent(patient.name)}`

  if (!mounted) return <div className="w-full max-w-[420px] aspect-[1.6] bg-[#1a2233] rounded-[40px] animate-pulse" />

  return (
    <div
      className="relative w-full max-w-[420px] cursor-pointer"
      style={{ perspective: '2000px', aspectRatio: '1.6' }}
      onClick={() => setIsFlipped(!isFlipped)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsFlipped(!isFlipped) }}
    >
        {/* Card Body */}
        <div 
          className={cn(
            "absolute inset-0 rounded-[40px] p-8 flex flex-col justify-between border transition-all duration-500",
              "border-white/10 bg-[#1a2233] text-white shadow-2xl shadow-black/40"
          )}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                DIGITAL HEALTH ID
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1 truncate max-w-[200px] sm:max-w-none">{patient.name}</h2>
              <p className="text-xs sm:text-sm font-mono text-slate-400 font-medium tracking-wide">
                {formatHealthId(patient.healthId)}
              </p>
            </div>
            
            <div className="w-20 h-20 rounded-[28px] border border-white/5 bg-white/5 flex items-center justify-center p-0.5">
               <div className="w-full h-full rounded-[26px] bg-[#1a2233] flex items-center justify-center border border-white/10 overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {patient.photoUrl ? (
                    <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-9 h-9 text-blue-400/40" />
                  )}
               </div>
            </div>
          </div>
          
          <div className="flex gap-10 mt-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">BLOOD TYPE</span>
              <span className="text-xl font-bold text-white leading-none">{patient.bloodGroup || 'B+'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">DOB</span>
              <span className="text-xl font-bold text-white leading-none">
                {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Provided'}
              </span>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2.5 text-slate-500/80">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3 h-3" />
              Verified EHI Node
            </motion.div>
            <div className="flex-1" />
            <Phone className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight">
              {patient.emergencyContact?.phone || 'Emergency Contact Active'}
            </span>
          </div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>

    </div>
  )
}
