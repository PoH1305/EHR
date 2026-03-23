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
      } else if (useUserStore.getState().role) {
        // If role is already known, skip role selection and go to login
        router.replace(`/auth/${useUserStore.getState().role}`)
      } else {
        router.replace('/auth/role')
      }
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [router, sessionState])

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative bg-[#080D16]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[18px] bg-[#0DCAD2] flex items-center justify-center text-white font-bold text-xl sm:text-2xl tracking-wide shadow-lg shadow-[#0DCAD2]/20">
          EHI
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-medium text-[#E2EAF0] mt-8 tracking-tight">EHI Platform</h1>
        <p className="text-[10px] sm:text-xs text-[#4A6075] mt-2 tracking-[0.2em] uppercase font-semibold">Electronic Health Identity</p>
        
        <div className="h-[1px] bg-white/5 w-12 my-10 rounded-full" />
        
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-[#0DCAD2]/10 text-[#0DCAD2] text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0DCAD2] animate-pulse" />
          FHIR R4 Protocol
        </div>

        <button 
          onClick={() => router.replace('/auth/role')}
          className="text-[10px] uppercase tracking-[0.2em] text-[#4A6075] hover:text-[#0DCAD2] transition-colors border-b border-white/5 pb-1"
        >
          Continue to Platform
        </button>
      </motion.div>
    </div>
  )
}
