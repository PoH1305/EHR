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
  Settings,
  Trash2,
  X,
  Loader2,
  Check
} from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { useToast } from '@/store/useToast'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/GlassCard'
import { DoctorSpecialty } from '@/lib/types'

export default function DoctorProfilePage() {
  const { 
    firebaseEmail, 
    firebaseUid, 
    role, 
    doctor, 
    signOut, 
    fetchDoctorProfile, 
    deleteAccount,
    updateDoctor 
  } = useUserStore()
  const { clearClinicalState } = useClinicalStore()
  const { toast } = useToast()
  const router = useRouter()

  const [isEditing, setIsEditing] = React.useState(false)
  const [editName, setEditName] = React.useState(doctor?.name || '')
  const [editSpecialty, setEditSpecialty] = React.useState<DoctorSpecialty>(doctor?.specialty || DoctorSpecialty.GENERAL_PRACTITIONER)
  const [editLicense, setEditLicense] = React.useState(doctor?.licenseNumber || '')
  const [isSaving, setIsSaving] = React.useState(false)

  // Initial load
  React.useEffect(() => {
    if (firebaseUid && !doctor) {
      void fetchDoctorProfile(firebaseUid)
    }
  }, [firebaseUid, doctor, fetchDoctorProfile])

  // Sync form state when doctor data changes, but NOT while editing
  React.useEffect(() => {
    if (doctor && !isEditing) {
      setEditName(doctor.name || '')
      setEditSpecialty(doctor.specialty || DoctorSpecialty.GENERAL_PRACTITIONER)
      setEditLicense(doctor.licenseNumber || '')
    }
  }, [doctor, isEditing])

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast("Name cannot be empty", "error")
      return
    }
    setIsSaving(true)
    try {
      await updateDoctor({
        name: editName,
        specialty: editSpecialty,
        licenseNumber: editLicense
      })
      toast("Profile updated successfully", "success")
      setIsEditing(false)
    } catch (error) {
      toast("Failed to update profile", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      clearClinicalState()
      await signOut()
      router.push('/auth/role')
      toast("Signed out successfully", "success")
    } catch (error) {
      toast("Failed to sign out", "error")
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "CRITICAL: This will permanently erase your clinical identity, including your license details, professional profile, and all access permissions. This action cannot be undone. Are you absolutely sure?"
    )

    if (!confirmed) return

    try {
      toast("Erasing clinical identity...", "info")
      await deleteAccount()
      router.push('/auth/role')
      toast("Account deleted successfully", "success")
    } catch (error: any) {
      toast(error.message || "Failed to delete account", "error")
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
          onClick={() => setIsEditing(true)}
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
              {doctor?.name?.[0]?.toUpperCase() || firebaseEmail?.[0]?.toUpperCase() || 'D'}
           </div>
           <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {doctor?.name || firebaseEmail?.split('@')[0] || 'Medical Practitioner'}
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
               <p className="text-sm font-bold text-white">{doctor?.email || firebaseEmail}</p>
            </div>
         </GlassCard>

         <GlassCard className="p-5 flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20">
               <BadgeCheck className="w-4 h-4" />
            </div>
            <div className="flex-1">
               <p className="text-[10px] uppercase font-bold text-white/20 tracking-wider">License Number</p>
               <p className="text-sm font-bold text-white font-mono">{doctor?.licenseNumber || 'PENDING'}</p>
            </div>
            <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest">
               {doctor?.licenseNumber && doctor.licenseNumber !== 'PENDING' ? 'Active' : 'Verification Pending'}
            </span>
         </GlassCard>

         <GlassCard className="p-5 flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20">
               <Stethoscope className="w-4 h-4" />
            </div>
            <div className="flex-1">
               <p className="text-[10px] uppercase font-bold text-white/20 tracking-wider">Specialization</p>
               <p className="text-sm font-bold text-white">{doctor?.specialty || 'General Practitioner'}</p>
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
            <GlassCard className="p-5 flex items-center justify-between group-hover:bg-white/[0.05] transition-all border-white/0 group-hover:border-white/10">
               <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/40">
                     <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                     <p className="text-sm font-bold text-white">Sign Out</p>
                     <p className="text-[10px] text-white/20 font-medium tracking-wider uppercase">Terminate Session</p>
                  </div>
               </div>
               <ChevronRight className="w-4 h-4 text-white/10" />
            </GlassCard>
         </button>

         <button 
           onClick={handleDeleteAccount}
           className="w-full text-left group mt-4"
         >
            <GlassCard className="p-5 flex items-center justify-between group-hover:bg-red-500/10 transition-all border-red-500/0 group-hover:border-red-500/20">
               <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                     <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                     <p className="text-sm font-bold text-red-500">Delete Clinical Identity</p>
                     <p className="text-[10px] text-red-500/40 font-medium tracking-wider uppercase">Permanent Data Erasure</p>
                  </div>
               </div>
               <ChevronRight className="w-4 h-4 text-red-500/20" />
            </GlassCard>
          </button>
       </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <GlassCard className="w-full max-w-md p-8 space-y-6 relative overflow-visible border-white/10 shadow-2xl">
              <button 
                onClick={() => setIsEditing(false)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-xl font-bold text-white mb-1">Edit Professional Identity</h3>
                <p className="text-xs text-white/30 truncate">Update your clinical credentials and specialty.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-white/20 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/5 px-4 text-white focus:outline-none focus:border-[#1A3A8F] transition-colors"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-white/20 ml-1">Clinical Specialty</label>
                  <div className="relative">
                    <select 
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value as DoctorSpecialty)}
                      className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/5 px-4 text-white appearance-none focus:outline-none focus:border-[#1A3A8F] transition-colors cursor-pointer"
                    >
                      {Object.values(DoctorSpecialty).map(s => (
                        <option key={s} value={s} className="bg-[#0b1019] py-2">{s}</option>
                      ))}
                    </select>
                    <ChevronRight className="w-4 h-4 text-white/20 absolute right-4 top-4 rotate-90 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-white/20 ml-1">License Number</label>
                  <input 
                    type="text" 
                    value={editLicense}
                    onChange={(e) => setEditLicense(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/5 px-4 text-white focus:outline-none focus:border-[#1A3A8F] transition-colors font-mono"
                    placeholder="e.g. MCI-2019-XXXX"
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full h-14 rounded-2xl bg-[#1A3A8F] text-white font-bold text-sm shadow-lg shadow-[#1A3A8F]/20 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Save Professional Profile
              </button>
           </GlassCard>
        </div>
      )}
    </div>
  )
}
