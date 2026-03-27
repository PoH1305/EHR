'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ShieldAlert, Info, Sparkles, RefreshCcw } from 'lucide-react'
import { useClinicalStore } from '@/store/useClinicalStore'
import { cn } from '@/lib/utils'

export function AnomalyBanner() {
  const { anomalies, runAIAnomalyCheck, isLoading } = useClinicalStore()

  if (!anomalies || anomalies.length === 0) return null

  const highSeverity = anomalies.filter(a => a.severity === 'HIGH')
  const mediumSeverity = anomalies.filter(a => a.severity === 'MEDIUM')
  const lowSeverity = anomalies.filter(a => a.severity === 'LOW')

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 space-y-4"
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Core Intelligence Insights</h3>
        </div>
        <button 
          onClick={() => runAIAnomalyCheck()}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-[9px] font-bold text-[#5B8DEF] hover:text-[#5B8DEF]/80 transition-colors uppercase tracking-widest disabled:opacity-50"
        >
          <RefreshCcw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          Re-Analyze
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {anomalies.map((anomaly, i) => (
            <motion.div
              key={`${anomaly.vitalType}-${i}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-5 rounded-[24px] border flex gap-4 items-start transition-all shadow-lg shadow-black/20",
                anomaly.severity === 'HIGH' ? "bg-red-500/10 border-red-500/20" :
                anomaly.severity === 'MEDIUM' ? "bg-amber-500/10 border-amber-500/20" :
                "bg-blue-500/10 border-blue-500/20"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                anomaly.severity === 'HIGH' ? "bg-red-500/20 text-red-500" :
                anomaly.severity === 'MEDIUM' ? "bg-amber-500/20 text-amber-500" :
                "bg-blue-500/20 text-blue-500"
              )}>
                {anomaly.severity === 'HIGH' ? <ShieldAlert className="w-5 h-5" /> : 
                 anomaly.severity === 'MEDIUM' ? <AlertTriangle className="w-5 h-5" /> : 
                 <Info className="w-5 h-5" />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    anomaly.severity === 'HIGH' ? "text-red-400" :
                    anomaly.severity === 'MEDIUM' ? "text-amber-400" :
                    "text-blue-400"
                  )}>
                    {anomaly.severity} Priority • {anomaly.vitalType}
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-snug">{anomaly.description}</p>
                <div className="pt-2 flex items-start gap-2">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">Rec:</span>
                  <p className="text-[11px] text-white/50 leading-relaxed italic">{anomaly.recommendation}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
