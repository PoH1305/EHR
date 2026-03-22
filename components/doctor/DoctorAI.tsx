'use client'

import React from 'react'
import { Sparkles, TrendingUp, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const INSIGHTS = [
  { id: '1', title: 'PRIYA NAIR • RISK FLAG', body: 'BP trending upward over 3 visits. Current medications may need dose adjustment. Recommend renal panel before next visit.', type: 'risk' },
  { id: '2', title: 'KIRAN RAO • URGENT', body: 'Chest pain + elevated troponin. Pattern suggests unstable angina. Immediate cardiology review recommended.', type: 'urgent' },
]

export default function DoctorAI() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-white">AI Insights</h1>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A3A8F]/20 border border-[#1A3A8F]/30">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5B8DEF] animate-pulse" />
          <span className="text-[10px] font-bold text-[#5B8DEF] uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div className="space-y-4">
        {INSIGHTS.map((insight, i) => (
          <motion.div 
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "p-5 rounded-2xl border flex flex-col gap-3 relative overflow-hidden",
              insight.type === 'urgent' ? "bg-red-500/5 border-red-500/10" : "bg-[#111827]/40 border-white/[0.05]"
            )}
          >
            <div className="flex items-center gap-2">
               <div className={cn("w-1.5 h-1.5 rounded-full", insight.type === 'urgent' ? "bg-red-500" : "bg-[#5B8DEF]")} />
               <span className={cn("text-[9px] font-bold uppercase tracking-widest", insight.type === 'urgent' ? "text-red-500" : "text-[#5B8DEF]")}>
                  {insight.title}
               </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed font-medium">
               {insight.body}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Vitals Trend • 7 Days</h2>
        <div className="bg-[#111827]/40 border border-white/[0.05] p-5 rounded-2xl">
           <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-white/50 font-medium">BP Systolic</span>
              <div className="flex items-center gap-1.5">
                 <TrendingUp className="w-3 h-3 text-red-500" />
                 <span className="text-sm font-bold text-red-500">126</span>
              </div>
           </div>
           <div className="flex items-end justify-between h-12 px-2 max-w-[200px]">
              {[30, 45, 35, 60, 50, 80, 70].map((h, i) => (
                <div key={i} className={cn("w-1.5 rounded-full transition-all duration-1000", i === 5 ? "bg-red-500 h-full" : "bg-[#1A3A8F]/40")} style={{ height: `${h}%` }} />
              ))}
           </div>
        </div>
      </div>

      <div className="bg-[#1A3A8F]/10 border border-[#1A3A8F]/20 p-5 rounded-2xl flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1A3A8F]/20 flex items-center justify-center">
               <Sparkles className="w-5 h-5 text-[#5B8DEF]" />
            </div>
            <div>
               <div className="text-[9px] font-bold text-[#5B8DEF] uppercase tracking-[0.2em] mb-0.5">Today&apos;s Summary</div>
               <div className="text-sm text-white font-medium">6 patients reviewed • 18 min avg</div>
            </div>
         </div>
         <ChevronRight className="w-4 h-4 text-[#5B8DEF]/40 group-hover:text-[#5B8DEF] transition-colors" />
      </div>
    </div>
  )
}
