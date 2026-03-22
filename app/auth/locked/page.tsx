'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'

export default function LockedPage() {
  const router = useRouter()
  const { signOut } = useUserStore()

  const handleReLogin = () => {
    signOut()
    router.replace('/auth')
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
      <div className="w-20 h-20 rounded-[24px] bg-red-500/10 flex items-center justify-center text-red-500 mb-8 border border-red-500/20 shadow-lg shadow-red-500/10">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-medium text-[#E2EAF0] mb-3 tracking-tight">Session Locked</h1>
      <p className="text-sm text-[#4A6075] mb-10 leading-relaxed">
        We could not verify your biometric credential. For your security, the current session has been terminated.
      </p>
      <button 
        onClick={handleReLogin}
        className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium text-white"
      >
        Sign in again
      </button>
    </div>
  )
}
