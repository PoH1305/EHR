'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EmergencyDataViewer } from '@/components/doctor/EmergencyDataViewer'
import { TemporaryRecordForm } from '@/components/doctor/TemporaryRecordForm'
import { EmergencyTimerBar } from '@/components/doctor/EmergencyTimerBar'
import { ConsentExpiredOverlay } from '@/components/doctor/ConsentExpiredOverlay'
import { ShieldAlert, Fingerprint, CheckCircle2, ArrowLeft, Search } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { extractEmergencyProfile } from '@/lib/emergencyProfile'
import { createTemporaryRecord } from '@/lib/temporaryId'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type EmergencyStep = 'SCAN' | 'CONFIRM' | 'TRIGGER' | 'VIEW' | 'TEMP_FORM' | 'EXPIRED'

export default function DoctorEmergencyPage() {
  const [step, setStep] = useState<EmergencyStep>('SCAN')
  const [targetId, setTargetId] = useState('')
  const [tempId, setTempId] = useState('')
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState<'30min' | '4hr' | 'until_merge'>('30min')
  const [expiresAt, setExpiresAt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [emergencyProfile, setEmergencyProfile] = useState<any>(null)
  
  const { role } = useUserStore()

  // 1. Handle Successful Scan (Legacy HealthID or New Handshake)
  const handleScanSuccess = async (scannedContent: string) => {
    try {
      if (scannedContent.startsWith('ehi://handshake')) {
        setIsProcessing(true)
        const url = new URL(scannedContent)
        const tokenId = url.searchParams.get('tokenId')
        const key = url.searchParams.get('key')
        
        if (!tokenId || !key) throw new Error('Invalid handshake link')

        // A. Validate Token
        const valRes = await fetch('/api/consent/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenHash: tokenId })
        })
        const valData = await valRes.json()
        if (!valRes.ok || !valData.valid) throw new Error('Invalid or expired token')

        // B. Fetch Encrypted Bundle from Relay
        const relayRes = await fetch(`/api/consent/relay?tokenHash=${tokenId}`)
        const relayData = await relayRes.json()
        if (!relayRes.ok) throw new Error('Clinical data not available on relay')

        // C. Decrypt Bundle
        const { decryptBundle } = await import('@/lib/crypto')
        const decryptedBundle = await decryptBundle(relayData.bundle, key)
        
        // D. Extract Profile & View
        const profile = extractEmergencyProfile(decryptedBundle)
        setEmergencyProfile(profile)
        setTargetId(valData.patientId || 'Decrypted Patient')
        setStep('VIEW')
      } else {
        // Legacy flow (Direct HealthID scan)
        const url = new URL(scannedContent)
        const healthId = url.searchParams.get('healthId')
        if (healthId) {
          setTargetId(healthId)
          setStep('CONFIRM')
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Handshake failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // 2. Trigger Break-Glass
  const handleTrigger = async () => {
    if (role !== 'doctor') return
    setIsProcessing(true)
    
    // Simulate WebAuthn assertion
    await new Promise(r => setTimeout(r, 1000))

    try {
      const res = await fetch('/api/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: targetId,
          doctorId: 'doc-mehta-001', // Fallback for demo
          reason,
          durationPreset: duration
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setExpiresAt(data.expiresAt)
      
      // Load real FHIR data and extract emergency profile
      // For the demo, we'll fetch from local Dexie and filter
      const bundle = await db.conditions.where('patientId').equals(targetId).toArray()
      const profile = extractEmergencyProfile({ resourceType: 'Bundle', entry: bundle.map(c => ({ resource: c })) } as any)
      setEmergencyProfile(profile)
      
      setStep('VIEW')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger emergency access')
    } finally {
      setIsProcessing(false)
    }
  }

  // 3. Handle Temp ID Creation
  const handleCreateTemp = async () => {
    setIsProcessing(true)
    const record = await createTemporaryRecord({
      approximateAge: null,
      gender: 'unknown',
      condition: 'Emergency Presentation',
      doctorId: 'doc-mehta-001'
    })
    setTempId(record.tempId)
    setStep('TEMP_FORM')
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 overflow-x-hidden">
      <AnimatePresence mode="wait">
        
        {step === 'SCAN' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 pt-20 max-w-md mx-auto"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-full text-center">
                <div className="flex flex-col items-center justify-center mb-12">
                    <ShieldAlert className="w-12 h-12 text-red-500 mb-6" />
                    <h1 className="text-2xl font-bold text-white mb-2">Emergency Protocol</h1>
                    <p className="text-sm text-white/40 mb-8">Manual bypass for critical care when patient is incapacitated.</p>
                    
                    <div className="space-y-4 w-full">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input 
                          type="text"
                          value={targetId}
                          onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                          placeholder="ENTER PATIENT EHI ID..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-red-500/50 transition-all"
                        />
                      </div>
                      
                      <button 
                        onClick={() => targetId.length >= 10 && setStep('CONFIRM')}
                        disabled={targetId.length < 10}
                        className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold uppercase tracking-widest shadow-lg shadow-red-600/20 disabled:opacity-30 transition-all"
                      >
                        Identify Patient
                      </button>
                      
                      <div className="flex items-center gap-4 py-4">
                        <div className="h-px bg-white/5 flex-1" />
                        <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">or</span>
                        <div className="h-px bg-white/5 flex-1" />
                      </div>

                      <button 
                        onClick={handleCreateTemp}
                        className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        Create Temporary ID
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        }

        {step === 'CONFIRM' && (
          <motion.div 
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 pt-24 text-center max-w-md mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
              <CheckCircle2 className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Patient Identified</h2>
            <p className="text-slate-400 text-sm mb-12">Health ID: <span className="text-white font-mono">{targetId}</span></p>
            
            <div className="space-y-4">
              <button 
                onClick={() => setStep('TRIGGER')}
                className="w-full py-4 rounded-3xl bg-red-500 text-white font-bold shadow-xl shadow-red-500/20 active:scale-95 transition-all"
              >
                Activate Emergency Access
              </button>
              <button 
                onClick={() => setStep('SCAN')}
                className="w-full py-4 rounded-3xl bg-white/5 text-slate-400 font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {step === 'TRIGGER' && (
          <motion.div 
            key="trigger"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 pt-20 max-w-md mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-white">Break-Glass Log</h2>
            </div>

            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-3">Emergency Reason</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter detailed reason (e.g. Unconscious patient, trauma)"
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-red-500 transition-colors h-32 resize-none"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {['Trauma', 'Cardiac', 'Stroke', 'Unconscious'].map(p => (
                    <button 
                      key={p} 
                      onClick={() => setReason(p + ' Emergency Access - Patient identified via digital health ID.')}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] uppercase font-bold text-slate-400 hover:bg-white/10"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-3">Access Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '30min', label: '30 Min' },
                    { id: '4hr', label: '4 Hours' },
                    { id: 'until_merge', label: 'Until Exit' }
                  ].map(d => (
                    <button 
                      key={d.id}
                      onClick={() => setDuration(d.id as any)}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                        duration === d.id 
                          ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20" 
                          : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={reason.length < 10 || isProcessing}
                  onClick={handleTrigger}
                  className="w-full py-4 rounded-3xl bg-white text-black font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isProcessing ? 'Authenticating...' : (
                    <>
                      <Fingerprint className="w-5 h-5" />
                      Verify & Confirm Access
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'VIEW' && (
          <motion.div 
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-16 px-6 max-w-md mx-auto"
          >
            <EmergencyTimerBar 
              expiresAt={expiresAt}
              onExpire={() => setStep('EXPIRED')}
              onExtend={() => {}}
              allowExtension={true}
            />
            {emergencyProfile && (
              <EmergencyDataViewer 
                profile={emergencyProfile}
                onFieldViewed={() => {}}
              />
            )}
          </motion.div>
        )}

        {step === 'TEMP_FORM' && (
          <motion.div 
            key="temp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 pt-20 max-w-md mx-auto"
          >
             <EmergencyTimerBar 
              expiresAt={new Date(Date.now() + 3600000).toISOString()} // 1hr for temp
              onExpire={() => setStep('EXPIRED')}
              onExtend={() => {}}
              allowExtension={false}
            />
            <TemporaryRecordForm 
              tempId={tempId}
              onSave={() => {}}
            />
          </motion.div>
        )}

        {step === 'EXPIRED' && (
          <ConsentExpiredOverlay 
            key="expired"
            onReturn={() => window.location.href = '/dashboard'}
          />
        )}

      </AnimatePresence>
    </div>
  )
}
