'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ShieldAlert, 
  User, 
  Droplet, 
  AlertTriangle, 
  Stethoscope, 
  Activity, 
  Phone, 
  Calendar,
  History,
  Heart
} from 'lucide-react'
import type { EmergencyProfile } from '@/lib/emergencyProfile'
import { cn } from '@/lib/utils'

interface EmergencyDataViewerProps {
  profile: EmergencyProfile
  onFieldViewed: (fieldName: string) => void
}

export function EmergencyDataViewer({ profile, onFieldViewed }: EmergencyDataViewerProps) {
  
  // Log initial render of field groups
  useEffect(() => {
    onFieldViewed('BASIC_IDENTITY')
    onFieldViewed('CRITICAL_WARNINGS')
    onFieldViewed('MEDICATIONS')
    onFieldViewed('HISTORY')
  }, [onFieldViewed])

  const Section = ({ title, icon: Icon, children, color = 'blue' }: any) => (
    <div className="glass-card overflow-hidden border border-white/10 bg-slate-900/40">
      <div className={cn(
        "px-5 py-3 flex items-center gap-2 border-b border-white/5",
        color === 'red' ? "bg-red-500/10" : "bg-blue-500/10"
      )}>
        <Icon className={cn("w-4 h-4", color === 'red' ? "text-red-400" : "text-blue-400")} />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white opacity-60">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )

  const InfoRow = ({ label, value, subValue }: any) => (
    <div className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0">
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-white">{value || 'None'}</span>
      {subValue && <span className="text-[11px] text-slate-400">{subValue}</span>}
    </div>
  )

  return (
    <div className="space-y-6 pb-20">
      {/* Identity Card */}
      <Section title="Emergency Identity" icon={User}>
        <div className="grid grid-cols-2 gap-6">
          <InfoRow label="Full Name" value={profile.fullName} />
          <InfoRow label="Calculated Age" value={`${profile.age || '??'} years`} />
          <InfoRow label="Gender" value={profile.gender.toUpperCase()} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Blood Group</span>
            <div className="flex items-center gap-2 mt-1">
              <Droplet className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-black text-white leading-none">{profile.bloodGroup}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Critical Warnings */}
      <Section title="Critical Warnings" icon={AlertTriangle} color="red">
        <div className="space-y-4">
          <div className="space-y-2.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Life-Threatening Allergies</span>
            {profile.allergies.length > 0 ? (
              profile.allergies.map((a, i) => (
                <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-sm font-bold text-red-200">{a.allergen}</p>
                  <p className="text-[11px] text-red-400/80">Severity: {a.severity.toUpperCase()} — {a.reaction}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No known allergies</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Critical Flags" value={profile.criticalConditions.join(', ') || 'None'} />
            <InfoRow label="Medical Implants" value={profile.deviceImplants.join(', ') || 'None'} />
          </div>
        </div>
      </Section>

      {/* Medications */}
      <Section title="Current Medications" icon={Heart}>
        <div className="space-y-3">
          {profile.currentMedications.length > 0 ? (
            profile.currentMedications.map((m, i) => (
              <div key={i} className="flex flex-col gap-0.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <span className="text-sm font-bold text-white">{m.name}</span>
                <span className="text-[11px] text-slate-400">{m.dose} — {m.frequency}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">No active medications registered</p>
          )}
        </div>
      </Section>

      {/* History */}
      <Section title="Clinical History" icon={History}>
        <div className="space-y-5">
          <InfoRow 
            label="Active Chronic Conditions" 
            value={profile.chronicConditions.map(c => c.name).join(', ') || 'None'} 
          />
          <div className="space-y-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Major Surgeries</span>
            {profile.majorSurgeries.map((s, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-white">{s.procedure}</span>
                <span className="text-slate-500 font-mono text-xs">{new Date(s.date).getFullYear()}</span>
              </div>
            ))}
          </div>
          <InfoRow 
            label="Organ Donor Status" 
            value={profile.organDonorStatus.isDonor ? "YES" : "NO"} 
            subValue={profile.organDonorStatus.isDonor ? `Organs: ${profile.organDonorStatus.organs.join(', ')}` : undefined}
          />
        </div>
      </Section>

      {/* Emergency Contact */}
      <Section title="Emergency Contact" icon={Phone}>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-lg font-bold text-white mb-0.5">{profile.emergencyContact.name}</p>
          <p className="text-xs text-slate-500 mb-4">{profile.emergencyContact.relationship}</p>
          <a 
            href={`tel:${profile.emergencyContact.phone}`}
            className="w-full py-3 rounded-xl bg-blue-500 text-white flex items-center justify-center gap-2 font-bold text-sm"
          >
            <Phone className="w-4 h-4" />
            Call Emergency Contact
          </a>
        </div>
      </Section>

      {/* Redacted Notice */}
      <div className="p-6 text-center space-y-3 border-t border-white/5 mt-10">
        <ShieldAlert className="w-5 h-5 text-slate-600 mx-auto" />
        <p className="text-[11px] text-slate-500 italic leading-relaxed">
          Psychiatric, genetic, and reproductive records are not accessible in emergency mode. This is by design to protect patient privacy even in overrides.
        </p>
      </div>
    </div>
  )
}
