'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldOff, Eye, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTimeRemaining } from '@/lib/consentTokens'
import type { ConsentToken } from '@/lib/types'
import Link from 'next/link'

interface ActiveAccessListProps {
  tokens: ConsentToken[]
  onRevoke: (tokenId: string, reason: string) => void
}

export function ActiveAccessList({ tokens, onRevoke }: ActiveAccessListProps) {
  if (tokens.length === 0) return null

  return (
    <div className="divide-y divide-white/5 border-t border-white/5">
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
  const [timeInfo, setTimeInfo] = useState(getTimeRemaining(token.expiresAt))
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getTimeRemaining(token.expiresAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [token.expiresAt])

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
          "w-2 h-2 rounded-full",
          timeInfo.urgent ? "bg-red-500 animate-pulse" : "bg-[#5B8DEF] shadow-[0_0_8px_rgba(91,141,239,0.3)]"
        )} />
        
        <div className="space-y-1">
          <p className="text-base font-semibold text-white group-hover:text-white/80 transition-colors">
            {token.recipientName}
          </p>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">
            {token.specialty} · {timeInfo.formatted} remaining
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link 
          href="/activity"
          className="p-3 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all"
          title="Audit Trail"
        >
          <Eye className="w-4 h-4" />
        </Link>

        {!showRevokeConfirm ? (
          <button 
            onClick={() => setShowRevokeConfirm(true)}
            className="p-3 rounded-full hover:bg-red-500/10 text-white/10 hover:text-red-500 transition-all"
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
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Revoke
            </button>
            <button 
              onClick={() => setShowRevokeConfirm(false)}
              className="p-2 text-white/20 hover:text-white transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
