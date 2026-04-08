'use client'

import React, { useState, useEffect } from 'react'
import { Clock, ShieldOff, Eye, Tag, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTimeRemaining } from '@/lib/consentTokens'
import type { ConsentToken } from '@/lib/types'
import { GlassCard } from './GlassCard'

interface ConsentTokenCardProps {
  token: ConsentToken
  onRevoke: (tokenId: string, reason: string) => void
}

const SPECIALTY_COLORS: Record<string, string> = {
  Cardiologist: 'bg-red-500/15 text-red-400',
  Dermatologist: 'bg-amber-500/15 text-amber-400',
  Psychiatrist: 'bg-purple-500/15 text-purple-400',
  Oncologist: 'bg-pink-500/15 text-pink-400',
  Neurologist: 'bg-indigo-500/15 text-indigo-400',
  'General Practitioner': 'bg-blue-500/15 text-blue-400',
  Emergency: 'bg-red-600/20 text-red-500',
  Gynecologist: 'bg-fuchsia-500/15 text-fuchsia-400',
  Endocrinologist: 'bg-teal-500/15 text-teal-400',
}

export function ConsentTokenCard({ token, onRevoke }: ConsentTokenCardProps) {
  const [timeInfo, setTimeInfo] = useState(getTimeRemaining(token.expiresAt, token.ttlSeconds))
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getTimeRemaining(token.expiresAt, token.ttlSeconds))
    }, 1000)
    return () => clearInterval(interval)
  }, [token.expiresAt, token.ttlSeconds])

  return (
    <GlassCard
      className={cn(
        'relative transition-all duration-300',
        timeInfo.urgent && 'border-red-500/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground truncate">{token.recipientName}</h3>
            {timeInfo.urgent && (
              <span className="animate-pulse w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            )}
          </div>
          <span className={cn(
            'inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest mt-1',
            SPECIALTY_COLORS[token.specialty] ?? 'bg-foreground/[0.05] text-foreground/40'
          )}>
            {token.specialty}
          </span>
        </div>

        <div className="text-right shrink-0">
           <div className={cn(
             "text-xs font-black uppercase tracking-widest",
             timeInfo.urgent ? "text-red-500" : "text-foreground/20"
           )}>
             {timeInfo.formatted}
           </div>
        </div>
      </div>

      {/* NEW: Live representation (Progress Bar) */}
      <div className="mt-4 space-y-1.5">
        <div className="h-1 w-full bg-foreground/[0.03] rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-linear rounded-full",
              timeInfo.urgent ? "bg-red-500" : "bg-blue-500"
            )}
            style={{ width: `${timeInfo.percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest opacity-30">
          <span>Active Session</span>
          <span>{Math.round(timeInfo.percent)}% Life</span>
        </div>
      </div>

      {/* Access count */}
      <div className="flex items-center gap-1.5 mt-2">
        <Eye className="w-3 h-3 text-foreground/30" />
        <span className="text-[10px] text-foreground/40">
          Accessed {token.accessCount} time{token.accessCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Access Purpose */}
      {token.purpose && (
        <div className="flex items-center gap-1.5 mt-2">
          <Tag className="w-3 h-3 text-foreground/30" />
          <span className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider">
            {token.purpose}
          </span>
        </div>
      )}

      {/* Privacy Badge */}
      <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-2xl bg-blue-500/5 border border-blue-500/10">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Client-Side AI Minimization Active</span>
      </div>

      {/* Sharing controls */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => {
            const shareUrl = `${window.location.origin}/patients?token=${token.tokenHash}&key=${token.tokenKey}&name=${encodeURIComponent(token.patientName || 'Authorized Patient')}`
            navigator.clipboard.writeText(shareUrl)
            // Assuming useToast is available in the parent or via context
            alert('Share link copied to clipboard!')
          }}
          className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Eye className="w-3.5 h-3.5" />
          Copy Share Link
        </button>
      </div>

      {/* Allowed categories */}
      {token.allowedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {token.allowedCategories.map((cat) => (
            <span key={cat} className="flex items-center gap-1 px-2 py-1 rounded-full bg-foreground/[0.05] text-[9px] text-foreground/50 border border-foreground/5">
              <Tag className="w-2.5 h-2.5" />
              {cat.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Revoke button */}
      {!showRevokeConfirm ? (
        <button
          onClick={() => setShowRevokeConfirm(true)}
          className="flex items-center gap-1.5 mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
        >
          <ShieldOff className="w-3.5 h-3.5" />
          Revoke Access
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder="Reason for revocation..."
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            className="w-full bg-foreground/[0.05] border border-foreground/10 rounded-xl px-3 py-1.5 text-xs text-foreground placeholder-foreground/30 focus:outline-none focus:ring-1 focus:ring-red-500/50"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onRevoke(token.id, revokeReason || 'No reason specified')
                setShowRevokeConfirm(false)
              }}
              className="flex-1 bg-red-500/20 text-red-500 text-xs py-1.5 rounded-xl hover:bg-red-500/30 transition-colors font-medium"
            >
              Confirm Revoke
            </button>
            <button
              onClick={() => setShowRevokeConfirm(false)}
              className="px-3 text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
