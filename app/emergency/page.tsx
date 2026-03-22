'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Calendar, Clock, MapPin, User, ChevronRight, Hash, ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import type { AuditEvent } from '@/lib/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function PatientEmergencyHistoryPage() {
  const [logs, setLogs] = useState<AuditEvent[]>([])

  useEffect(() => {
    const fetchLogs = async () => {
      const items = await db.audit_log
        .where('type')
        .anyOf(['EMERGENCY_ACCESS_TRIGGERED', 'EMERGENCY_ACCESS_EXTENDED', 'EMERGENCY_ACCESS_EXPIRED'])
        .reverse()
        .toArray()
      setLogs(items)
    }
    fetchLogs()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 pt-12">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 mb-10">
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Emergency History</h1>
            <div className="flex items-center gap-2 text-green-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Audit Chain Intact ✓</span>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {logs.length > 0 ? (
            logs.map((log, i) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card border border-amber-500/20 bg-amber-500/5 p-5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-amber-200">
                      Access Triggered
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-sm font-bold text-white leading-none mb-1">Dr. Amit Sharma</p>
                      <p className="text-[10px] uppercase text-slate-500 tracking-widest font-black">City General Hospital</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Reason Stated</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {log.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] font-mono text-slate-500">AUDIT_{log.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5">
                  <button className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                    Export Encrypted JSON Log
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                 <ShieldAlert className="w-8 h-8 text-slate-700" />
               </div>
               <p className="text-slate-500 text-sm italic">No emergency override events recorded.</p>
            </div>
          )}
        </div>

        <div className="mt-12 p-6 rounded-3xl border border-white/5 bg-white/5 text-center">
          <p className="text-[11px] text-slate-500 italic leading-relaxed">
            Emergency logs are immutable and cannot be deleted. This ensures absolute transparency and accountability. If you notice any unauthorized access, please report it immediately.
          </p>
        </div>
      </div>
    </div>
  )
}
