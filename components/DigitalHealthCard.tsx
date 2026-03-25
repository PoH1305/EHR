'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Phone, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DigitalHealthCardProps {
  name: string
  healthId: string
  bloodGroup: string
  birthDate: string
  emergencyPhone: string
  photoUrl?: string | null
  className?: string
}

export function DigitalHealthCard({
  name,
  healthId,
  bloodGroup,
  birthDate,
  emergencyPhone,
  photoUrl,
  className
}: DigitalHealthCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative w-full max-w-sm aspect-[1.6/1] rounded-[32px] overflow-hidden p-6 text-white shadow-2xl",
        "bg-[#111827] border border-white/10",
        className
      )}
    >
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full blur-2xl -ml-12 -mb-12" />

      <div className="relative h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-foreground/40">
              Digital Health ID
            </span>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              {name || 'New Patient'}
            </h3>
            <p className="text-[11px] font-mono text-foreground/40 mt-1 uppercase tracking-wider">
              {healthId || 'EHI-NOT-SET'}
            </p>
          </div>
          
          <div className="w-16 h-16 rounded-3xl bg-foreground/[0.03] border border-foreground/10 flex items-center justify-center overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-foreground/20" />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-12">
            <div>
              <span className="text-[9px] font-medium uppercase tracking-widest text-foreground/30">Blood Type</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{bloodGroup || 'B+'}</p>
            </div>
            <div>
              <span className="text-[9px] font-medium uppercase tracking-widest text-foreground/30">DOB</span>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {birthDate ? new Date(birthDate).toLocaleDateString() : '1 Jan 1990'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/5">
            <Phone className="w-4 h-4 text-foreground/30" />
            <p className="text-[11px] font-medium text-foreground/50 tracking-wide">
              Emergency Contact — <span className="text-foreground/80">{emergencyPhone || '+91 98765 43210'}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
