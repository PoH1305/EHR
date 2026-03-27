'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Shield, Lock, Link2, Download, Trash2, Save, LayoutDashboard, Monitor, Sun, Moon, AlertTriangle, LogOut } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { formatHealthId, calculateAge } from '@/lib/utils'
import { SENSITIVE_FIELD_CATEGORIES } from '@/lib/aiFilter'
import { SUPPORTED_EHR_SYSTEMS } from '@/lib/smartFhir'
import { GlassCard } from '@/components/GlassCard'

export default function ProfilePage() {
  const router = useRouter()
  const { 
    patient, 
    updatePatient,
    deleteAccount,
    signOut
  } = useUserStore()
  const { theme, setTheme } = useTheme()
  const profile = patient
  
  const [name, setName] = useState(profile?.name || '')
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || '')
  const [emergencyName, setEmergencyName] = useState(profile?.emergencyContact?.name || '')
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergencyContact?.phone || '')
  const [emergencyRelation, setEmergencyRelation] = useState(profile?.emergencyContact?.relationship || 'Guardian')
  const [success, setSuccess] = useState<string | null>(null)
  const [privacySettings, setPrivacySettings] = useState<Record<string, boolean>>({
    psychiatric_records: false,
    genetic_reports: false,
    reproductive_health: false,
    social_history: false,
    substance_use_history: false,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportData = () => {
    const data = JSON.stringify(profile, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `EHI_${profile?.healthId || 'export'}_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await deleteAccount()
      router.replace('/auth/role')
    } catch {
      alert('Failed to delete account. Please try again.')
      setIsDeleting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/auth/patient')
    } catch (error) {
      console.error('Sign out failed:', error)
      alert('Failed to sign out. Please try again.')
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <User className="w-16 h-16 text-foreground/10" />
        <h2 className="text-xl font-bold">No Profile Loaded</h2>
        <p className="text-center text-foreground/50 text-sm">
          Please initialize your Health ID to view and edit your profile.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer group">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden flex items-center justify-center ring-2 ring-foreground/5">
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-primary/40" />
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-3xl transition-opacity">
            <span className="text-[10px] text-white font-medium">Upload</span>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  if (e.target?.result) updatePatient({ photoUrl: e.target.result as string })
                }
                reader.readAsDataURL(file)
              }
            }}
          />
        </label>
        <div>
          <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
          <p className="font-mono text-xs text-foreground/40 mt-0.5">
            {formatHealthId(profile.healthId)}
          </p>
          <p className="text-[10px] text-foreground/25 mt-1">
            {calculateAge(profile.birthDate)} years • {profile.gender} • {profile.bloodGroup}
          </p>
        </div>
      </div>

      {/* Bio Section */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-foreground/60 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" /> Personal Information
        </h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-foreground/30">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-foreground/[0.05] border border-foreground/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-foreground/30">Date of Birth</span>
              <input
                type="date"
                defaultValue={profile.birthDate}
                className="w-full mt-1 bg-foreground/[0.05] border border-foreground/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </label>
            <label className="block">
              <span className="text-xs text-foreground/30">Blood Group</span>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full mt-1 bg-foreground/[0.05] border border-foreground/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </label>
          </div>
          <div>
            <span className="text-xs text-foreground/30">Emergency Contact</span>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Name"
                className="bg-foreground/[0.05] border border-foreground/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Phone"
                className="bg-foreground/[0.05] border border-foreground/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <input
              type="text"
              value={emergencyRelation}
              onChange={(e) => setEmergencyRelation(e.target.value)}
              placeholder="Relationship (e.g. Spouse, Parent)"
              className="w-full mt-2 bg-foreground/[0.05] border border-foreground/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button 
            onClick={() => {
              updatePatient({
                name,
                bloodGroup,
                emergencyContact: { 
                  name: emergencyName, 
                  phone: emergencyPhone,
                  relationship: emergencyRelation
                }
              })
              setSuccess('Profile updated successfully!')
              setTimeout(() => setSuccess(null), 3000)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          {success && <p className="text-[10px] text-green-400 pt-2">{success}</p>}
        </div>
      </GlassCard>




      {/* Dashboard Preferences */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-foreground/60 mb-4 flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4" /> Dashboard Preferences
        </h3>
        <div className="space-y-6">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/70 tracking-wide">Display Theme</p>
              <p className="text-[10px] text-foreground/30 mt-0.5">Switch between light, dark, or system theme</p>
            </div>
            <div className="flex items-center gap-2 bg-foreground/[0.05] rounded-xl p-1 border border-foreground/10">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  theme === 'light' ? "bg-white text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60"
                )}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  theme === 'dark' ? "bg-slate-800 text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60"
                )}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  theme === 'system' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60"
                )}
                title="System Mode"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Privacy Section */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-foreground/60 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Privacy Controls
        </h3>
        <p className="text-[10px] text-foreground/30 mb-3">
          Toggle categories off to block all doctors from accessing these record types.
        </p>
        <div className="space-y-2">
          {Object.entries(SENSITIVE_FIELD_CATEGORIES).map(([key, description]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground/60 capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-foreground/25 mt-0.5 max-w-[250px]">{description}</p>
              </div>
              <button
                onClick={() => setPrivacySettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-all duration-200 border",
                  privacySettings[key] ? "bg-primary border-primary" : "bg-foreground/20 border-foreground/10"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 rounded-full transition-transform duration-200 shadow-sm",
                  privacySettings[key] ? "left-7 bg-white" : "left-1 bg-white dark:bg-slate-300"
                )} />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>



      {/* Danger Zone */}
      <GlassCard className="border-red-500/10">
        <h3 className="text-sm font-semibold text-red-400/60 mb-4">Account Operations</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 text-sm text-foreground/50 hover:text-foreground/70 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 text-sm text-foreground/50 hover:text-foreground/70 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-sm text-red-400/60 hover:text-red-400 transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-bold">This action is irreversible</span>
            </div>
            <p className="text-xs text-foreground/50">
              All your medical records, profile data, encryption keys, and health identity will be permanently erased from this device.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-foreground/5 text-sm text-foreground/60 hover:bg-foreground/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-sm text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
