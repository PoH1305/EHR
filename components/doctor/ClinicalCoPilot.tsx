'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useAgentStore } from '@/store/useAgentStore'
import type { ClinicalFinding } from '@/lib/types'

interface ClinicalCoPilotProps {
  patientId: string
  patientName: string
}

export function ClinicalCoPilot({ patientId, patientName }: ClinicalCoPilotProps) {
  const { vitals, conditions, medications, isLoading } = useClinicalStore()
  const { priorityQueue } = useAgentStore()
  const [analysis, setAnalysis] = useState<{
    summary: string
    risks: { level: 'low' | 'medium' | 'high'; label: string; desc: string }[]
    recommendations: string[]
    findings: ClinicalFinding[]
  } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (!isLoading && vitals.length > 0) {
      runAnalysis()
    }
  }, [patientId, vitals, conditions, medications, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    // Simulate complex AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500))

    const triageAlert = priorityQueue.find(q => q.patientId === patientId)
    const anomalousVitals = vitals.filter(v => v.anomalous)
    const hasHypertension = conditions.some(c => c.code?.text?.toLowerCase()?.includes('hypertension'))
    
    const risks: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
    const recommendations: string[] = []
    const findings: ClinicalFinding[] = []

    if (triageAlert) {
      risks.push({
        level: triageAlert.severity === 'high' ? 'high' : 'medium',
        label: 'Agentic Triage Alert',
        desc: triageAlert.reason
      })
      recommendations.push('Immediate review of vitals trend required.')
    }

    if (anomalousVitals.length > 0 && !triageAlert) {
      risks.push({
        level: 'medium',
        label: 'Vitals Instability',
        desc: `${anomalousVitals.map(v => v.type.replace(/([A-Z])/g, ' $1')).join(', ')} outside range.`
      })
    }

    if (hasHypertension && (vitals.find(v => v.type === 'bloodPressureSystolic')?.latestValue ?? 0) > 140) {
      risks.push({
        level: 'medium',
        label: 'Uncontrolled HTN',
        desc: 'Persistent elevation despite current regimen.'
      })
      findings.push({
        id: 'f1',
        category: 'Cardiovascular',
        finding: 'Stage 2 Hypertensive Pattern',
        confidence: 0.92,
        severity: 'A-NORMAL'
      })
    }

    setAnalysis({
      summary: `${patientName} shows a pattern of ${anomalousVitals.length > 0 ? 'clinical instability' : 'stable health'} with ${risks.length} active risk flags identified.`,
      risks,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue current care plan.', 'Follow up in 3 months.'],
      findings
    })
    setIsAnalyzing(false)
  }

  return (
    <div className="bg-[#0d1117] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5B8DEF]/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#5B8DEF]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">Clinical CoPilot</span>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 text-[#5B8DEF] animate-spin" />
            <span className="text-[10px] text-[#5B8DEF] font-bold uppercase tracking-tighter">AI Analyzing...</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        <AnimatePresence mode="wait">
          {isAnalyzing || !analysis ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center gap-4 text-center"
            >
               <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-[#5B8DEF]/20 border-t-[#5B8DEF] animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-[#5B8DEF] animate-pulse" />
               </div>
               <div>
                  <p className="text-sm font-medium text-white/60">Reviewing clinical records...</p>
                  <p className="text-[10px] text-white/20 mt-1 uppercase tracking-widest">Building specialized correlation model</p>
               </div>
            </motion.div>
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-4 rounded-2xl bg-[#5B8DEF]/5 border border-[#5B8DEF]/10">
                <p className="text-xs text-[#5B8DEF] leading-relaxed font-medium">
                  {analysis.summary}
                </p>
              </div>

              {analysis.risks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Active Risks</h3>
                  {analysis.risks.map((risk, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <AlertCircle className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        risk.level === 'high' ? "text-red-500" : "text-yellow-500"
                      )} />
                      <div>
                        <div className="text-xs font-bold text-white">{risk.label}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{risk.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Recommendations</h3>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                       <CheckCircle2 className="w-3.5 h-3.5 text-green-500/40 group-hover:text-green-500 transition-colors" />
                       <span className="text-[11px] text-white/60 group-hover:text-white/80 transition-colors">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                 <button className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.05] rounded-xl flex items-center justify-center gap-2 group transition-all">
                    <span className="text-[10px] font-bold text-white/40 group-hover:text-white/60 uppercase tracking-widest">Full Intelligence Report</span>
                    <ArrowRight className="w-3 h-3 text-white/20 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
