import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Eye, Lock } from 'lucide-react'
import { DoctorSpecialty } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FilterPreviewCardProps {
  specialty: DoctorSpecialty
  filteredCount: number
  totalCount: number
  blockedCategories: string[]
}

export function FilterPreviewCard({ specialty, filteredCount, totalCount, blockedCategories }: FilterPreviewCardProps) {
  const hiddenCount = totalCount - filteredCount

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 mt-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">AI Minimization Preview</h4>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Trust Boundary: Your Device</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Visible Fields</p>
          <div className="flex items-center justify-center gap-2">
            <Eye className="w-4 h-4 text-green-500" />
            <span className="text-2xl font-black text-white">{filteredCount}</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Hidden Fields</p>
          <div className="flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            <span className="text-2xl font-black text-slate-400">{hiddenCount}</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Automated Policy Blocks</p>
        <div className="flex flex-wrap gap-2">
          {blockedCategories.length > 0 ? (
            Array.from(new Set(blockedCategories)).map((cat) => (
              <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-500">
                <Lock className="w-3 h-3" />
                <span>{cat.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            ))
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500">
              No sensitive categories found
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
