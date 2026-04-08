'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldOff, Eye, AlertCircle, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTimeRemaining } from '@/lib/consentTokens'
import type { ConsentToken } from '@/lib/types'
import Link from 'next/link'

interface ActiveAccessListProps {
  tokens: ConsentToken[]
  onRevoke: (tokenId: string, reason: string) => void
}

export function ActiveAccessList({ tokens, onRevoke }: ActiveAccessListProps) {
  if (tokens.length === 0) {
    return (
      <div className="py-12 border-t border-foreground/[0.05] flex flex-col items-center justify-center text-center opacity-10">
         <ShieldCheck className="w-6 h-6 mb-2 stroke-1 text-foreground" />
         <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">No Active Connections</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-foreground/[0.05] border-t border-foreground/[0.05]">
      <AnimatePresence mode="popLayout">
        {tokens.map((token) => (
          <ActiveAccessRow 
            key={token.id} 
            token={token} 
            onRevoke={onRevoke} 
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ActiveAccessRow({ token, onRevoke }: { token: ConsentToken, onRevoke: (id: string, reason: string) => void }) {
  const [timeInfo, setTimeInfo] = useState(getTimeRemaining(token.expiresAt, token.ttlSeconds))
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getTimeRemaining(token.expiresAt, token.ttlSeconds))
    }, 1000)
    return () => clearInterval(interval)
  }, [token.expiresAt, token.ttlSeconds])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="zero-border-row group py-8"
    >
      <div className="flex items-center gap-6">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full",
          timeInfo.urgent ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-[#5B8DEF] shadow-[0_0_8px_rgba(91,141,239,0.3)]"
        )} />
        
        <div className="space-y-1">
          <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
            {token.recipientName}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.15em]">
              {token.specialty}
            </p>
            <span className="w-1 h-1 rounded-full bg-foreground/10" />
            <p className={cn(
               "text-[10px] font-black uppercase tracking-[0.1em]",
               timeInfo.urgent ? "text-red-500" : "text-foreground/20"
            )}>
              {timeInfo.formatted} remaining
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link 
          href="/activity"
          className="p-3 rounded-full hover:bg-foreground/[0.03] text-foreground/20 hover:text-foreground transition-all"
          title="Audit Trail"
        >
          <Eye className="w-4 h-4" />
        </Link>

        {!showRevokeConfirm ? (
          <button 
            onClick={() => setShowRevokeConfirm(true)}
            className="p-3 rounded-full hover:bg-red-500/10 text-foreground/10 hover:text-red-500 transition-all"
            title="Terminate Access"
          >
            <ShieldOff className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
            <button 
              onClick={() => {
                onRevoke(token.id, 'User revoked access from dashboard')
                setShowRevokeConfirm(false)
              }}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-500/20"
            >
              Confirm Terminate
            </button>
            <button 
              onClick={() => setShowRevokeConfirm(false)}
              className="p-2 text-foreground/20 hover:text-foreground transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
