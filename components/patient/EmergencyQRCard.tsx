'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldAlert, AlertCircle } from 'lucide-react'
import { formatHealthId } from '@/lib/utils'

interface EmergencyQRCardProps {
  patientId: string
  healthId: string
}

export function EmergencyQRCard({ patientId, healthId }: EmergencyQRCardProps) {
  const qrValue = `ehi://connect?healthId=${healthId}&patientId=${patientId}`

  return (
    <div className="p-6 rounded-[40px] bg-[#1a0a0a] border border-red-500/30 text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
      
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 mb-6">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-100/60">Scan for Emergency Access</span>
        </div>

        <div className="bg-white p-4 rounded-[32px] shadow-2xl mb-6 ring-1 ring-red-500/20">
          <QRCodeSVG
            value={qrValue}
            size={180}
            level="H"
            bgColor="#ffffff"
            fgColor="#1a0a0a"
            includeMargin={false}
          />
        </div>

        <div className="text-center space-y-1 mb-6">
          <p className="text-xl font-mono font-bold tracking-tight text-white">{formatHealthId(healthId)}</p>
          <div className="flex items-center justify-center gap-1.5 text-slate-500">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Medical data is not stored in this QR</span>
          </div>
        </div>

        <div className="w-full h-px bg-white/5 mb-6" />

        <div className="text-center">
          <p className="text-[11px] text-slate-500 italic max-w-[240px] mx-auto leading-relaxed">
            In an emergency, healthcare providers can scan this code to access critical life-saving clinical information. Every access is fully audited.
          </p>
        </div>
      </div>
    </div>
  )
}
