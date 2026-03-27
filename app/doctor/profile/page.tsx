'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  BadgeCheck, 
  Stethoscope, 
  LogOut, 
  Shield, 
  ChevronRight,
  Settings
} from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useToast } from '@/store/useToast'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/GlassCard'

export default function DoctorProfilePage() {
  const { firebaseEmail, role, signOut } = useUserStore()
  const { clearClinicalState } = useClinicalStore()
  const { toast } = useToast()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      clearClinicalState()
      await signOut()
      router.push('/auth/doctor')
      toast("Signed out successfully", "success")
    } catch (error) {
      toast("Failed to sign out", "error")
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-4xl font-black text-white tracking-tight">Profile.</h1>
           <p className="text-sm text-white/30 font-medium mt-1">Clinical Practitioner Identity</p>
        </div>
        <button 
          onClick={() => toast("Settings coming soon", "info")}
          className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/40 hover:text-white/60 transition-colors"
        >
           <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Header */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1A3A8F] to-[#5B8DEF] rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-500" />
        <GlassCard className="p-8 flex flex-col items-center text-center gap-6 relative overflow-hidden">
           <div className="w-24 h-24 rounded-[32px] bg-[#1A3A8F] flex items-center justify-center border-4 border-white/10 text-white font-black text-3xl shadow-2xl">
              {firebaseEmail ? firebaseEmail[0].toUpperCase() : 'D'}
           </div>
           <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {firebaseEmail?.split('@')[0] || 'Medical Practitioner'}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2 text-white/40">
                 <BadgeCheck className="w-4 h-4 text-[#5B8DEF]" />
                 <span className="text-xs font-bold uppercase tracking-widest text-[#5B8DEF]">Verified Doctor</span>
              </div>
           </div>
        </GlassCard>
      </div>

      {/* Info Sections */}
      <div className="space-y-3">
         <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/20 ml-1">Professional Details</h3>
         
         <GlassCard className="p-5 flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20">
               <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1">
               <p className="text-[10px] uppercase font-bold text-white/20 tracking-wider">Clinical Email</p>
               <p className="text-sm font-bold text-white">{firebaseEmail}</p>
            </div>
         </GlassCard>

         <GlassCard className="p-5 flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20">
               <BadgeCheck className="w-4 h-4" />
            </div>
            <div className="flex-1">
               <p className="text-[10px] uppercase font-bold text-white/20 tracking-wider">License Number</p>
               <p className="text-sm font-bold text-white font-mono">DMC-88291-EXP</p>
            </div>
            <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest">Active</span>
         </GlassCard>

         <GlassCard className="p-5 flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20">
               <Stethoscope className="w-4 h-4" />
            </div>
            <div className="flex-1">
               <p className="text-[10px] uppercase font-bold text-white/20 tracking-wider">Specialization</p>
               <p className="text-sm font-bold text-white">General Cardiology</p>
            </div>
         </GlassCard>
      </div>

      {/* Security & Support */}
      <div className="space-y-3 pt-4">
         <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/20 ml-1">Account Management</h3>
         
         <button className="w-full text-left group">
            <GlassCard className="p-5 flex items-center justify-between group-hover:bg-white/[0.05] transition-all">
               <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20">
                     <Shield className="w-4 h-4" />
                  </div>
                  <div>
                     <p className="text-sm font-bold text-white">Security Settings</p>
                     <p className="text-[10px] text-white/20 font-medium">2FA & Access Logs</p>
                  </div>
               </div>
               <ChevronRight className="w-4 h-4 text-white/10" />
            </GlassCard>
         </button>

         <button 
           onClick={handleSignOut}
           className="w-full text-left group"
         >
            <GlassCard className="p-5 flex items-center justify-between group-hover:bg-red-500/10 transition-all border-red-500/0 group-hover:border-red-500/20">
               <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                     <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                     <p className="text-sm font-bold text-red-500">Sign Out</p>
                     <p className="text-[10px] text-red-500/40 font-medium">Terminate Clinical Session</p>
                  </div>
               </div>
               <ChevronRight className="w-4 h-4 text-red-500/20" />
            </GlassCard>
         </button>
      </div>
    </div>
  )
}
