'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'

export default function SplashPage() {
  const router = useRouter()
  const { sessionState } = useUserStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      // If they are fully authenticated or locked, send them inside
      // AppGate will immediately lock them if they aren't verified yet
      if (sessionState === 'AUTHENTICATED' || sessionState === 'LOCKED') {
        router.replace('/dashboard')
      } else {
        router.replace('/auth/role')
      }
    }, 2500)
    
    return () => clearTimeout(timer)
  }, [router, sessionState])

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[18px] bg-[#0D7377] flex items-center justify-center text-white font-bold text-xl sm:text-2xl tracking-wide shadow-lg shadow-[#0D7377]/20">
          EHI
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-medium text-[#E2EAF0] mt-8 tracking-tight">EHI Platform</h1>
        <p className="text-xs sm:text-sm text-[#354A5A] mt-2 tracking-[0.06em] uppercase">Electronic Health Identity</p>
        
        <div className="h-[1px] bg-white/5 w-12 my-8 rounded-full" />
        
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-[#0D7377]/10 text-[#14A69C] text-[10px] sm:text-xs font-medium uppercase tracking-wider">
          <div className="w-1.5 h-1.5 rounded-full bg-[#14A69C] animate-pulse" />
          FHIR R4
        </div>
      </motion.div>
    </div>
  )
}
