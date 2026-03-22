'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { User, Stethoscope } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { cn } from '@/lib/utils'

export default function RoleSelectionPage() {
  const router = useRouter()
  const { role, setRole } = useUserStore()

  const handleContinue = () => {
    if (!role) return
    router.push(`/auth/${role}`)
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 sm:px-12 sm:py-16 max-w-md mx-auto w-full">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm transition-colors",
        role === 'doctor' ? "bg-[#1A3A8F]" : "bg-[#0D7377]"
      )}>
        EHI
      </div>
      
      <div className="mt-12">
        <h1 className="text-3xl sm:text-4xl font-medium text-[#E2EAF0] leading-tight tracking-tight">Who are<br />you?</h1>
        <p className="text-sm text-[#4A6075] mt-2 leading-relaxed">Choose your role<br />to continue.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-10">
        <button
          onClick={() => setRole('patient')}
          className={cn(
            "flex-1 p-5 rounded-2xl border text-left transition-all flex flex-col gap-3",
            role === 'patient' 
              ? "border-[#0D7377] bg-[#0D7377]/10" 
              : "border-white/[0.07] bg-[#111820]"
          )}
        >
          <div className="w-10 h-10 rounded-[10px] bg-[#0D7377]/15 flex items-center justify-center text-[#0D7377]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#E2EAF0]">Patient</div>
            <div className="text-[10px] text-[#354A5A] mt-1 leading-snug">Access your health records</div>
          </div>
        </button>

        <button
          onClick={() => setRole('doctor')}
          className={cn(
            "flex-1 p-5 rounded-2xl border text-left transition-all flex flex-col gap-3",
            role === 'doctor' 
              ? "border-[#1A3A8F] bg-[#1A3A8F]/15" 
              : "border-white/[0.07] bg-[#111820]"
          )}
        >
          <div className="w-10 h-10 rounded-[10px] bg-[#1A3A8F]/20 flex items-center justify-center text-[#1A3A8F]">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#E2EAF0]">Doctor</div>
            <div className="text-[10px] text-[#354A5A] mt-1 leading-snug">Clinical access & records</div>
          </div>
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={handleContinue}
        disabled={!role}
        className={cn(
          "w-full py-4 rounded-xl font-medium transition-all text-sm mt-12",
          role === 'patient' && "bg-[#0D7377] text-white hover:bg-[#0D7377]/90",
          role === 'doctor' && "bg-[#1A3A8F] text-white hover:bg-[#1A3A8F]/90",
          !role && "bg-white/5 text-white/30 cursor-not-allowed"
        )}
      >
        {role ? `Continue as ${role === 'patient' ? 'Patient' : 'Doctor'}` : 'Select a role'}
      </button>

      {role && (
        <p className="text-[10px] text-[#2A3D4D] text-center mt-4">
          Tap a card to switch role
        </p>
      )}
    </div>
  )
}
