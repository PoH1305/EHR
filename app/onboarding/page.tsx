'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  MapPin, 
  Activity, 
  ChevronRight, 
  ChevronLeft, 
  Camera, 
  Heart,
  Droplets,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import { useClinicalStore } from '@/store/useClinicalStore'
import { DigitalHealthCard } from '@/components/DigitalHealthCard'
import type { PatientProfile } from '@/lib/types'

const STEPS = [
  { id: 'identity', title: 'Identity', icon: User, description: 'Basic patient information' },
  { id: 'contact', title: 'Contact', icon: MapPin, description: 'Reachability & Emergency' },
  { id: 'medical', title: 'Medical', icon: Activity, description: 'Basic clinical background' },
  { id: 'preview', title: 'Preview', icon: ShieldCheck, description: 'Digital Health Identity' }
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const COMMON_CONDITIONS = ['Hypertension', 'Diabetes', 'Asthma', 'Thyroid', 'Heart Disease']
const COMMON_ALLERGIES = ['Penicillin', 'Sulfa', 'Latex', 'Pollen', 'Peanuts']

export default function OnboardingPage() {
  const router = useRouter()
  const { setPatient, setRole, setSessionState } = useUserStore()
  const { addCondition, addObservation } = useClinicalStore()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<PatientProfile & {
    conditions: string[]
    allergies: string[]
  }>>({
    name: '',
    birthDate: '',
    gender: 'other',
    bloodGroup: '',
    address: '',
    city: '',
    pincode: '',
    emergencyContact: { name: '', relationship: '', phone: '' },
    conditions: [],
    allergies: [],
    pastSurgeries: '',
    organDonor: 'Unspecified',
    insuranceId: ''
  })
  const [isCheckingCloud, setIsCheckingCloud] = useState(true)

  // 1. Proactive Cloud Check (Second Layer Safety)
  useEffect(() => {
    const checkExisting = async () => {
      const { firebaseUid } = useUserStore.getState()
      if (!firebaseUid) {
        setIsCheckingCloud(false)
        return
      }

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('profiles')
          .select('data')
          .eq('id', firebaseUid)
          .single()

        if (data && data.data) {
          console.log('[Onboarding] Existing profile found. Redirecting...')
          const profile = data.data as PatientProfile
          setRole('patient')
          setPatient(profile)
          setSessionState('AUTHENTICATED')
          router.replace('/dashboard')
          return
        }
      } catch (err) {
        console.log('[Onboarding] Cloud check skipped or not found.')
      } finally {
        setIsCheckingCloud(false)
      }
    }

    checkExisting()
  }, [router, setPatient, setRole, setSessionState])

  // 2. ID Generation
  useEffect(() => {
    if (!formData.healthId && !isCheckingCloud) {
      const g = () => Math.random().toString(36).substring(2, 6).toUpperCase()
      const generated = `EHI-${g()}-${g()}-${g()}`
      setFormData(prev => ({ ...prev, healthId: generated }))
    }
  }, [formData.healthId])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(curr => curr + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1)
    }
  }

  const completeOnboarding = async () => {
    const { firebaseUid, checkHealthIdUnique } = useUserStore.getState()
    const patientId = firebaseUid || `pat-${Date.now()}`
    
    // Ensure Health ID is unique
    let healthId = formData.healthId
    if (healthId) {
      const isUnique = await checkHealthIdUnique(healthId)
      if (!isUnique) {
        // Regenerate if collision
        const g = () => Math.random().toString(36).substring(2, 6).toUpperCase()
        healthId = `EHI-${g()}-${g()}-${g()}`
      }
    } else {
      const g = () => Math.random().toString(36).substring(2, 6).toUpperCase()
      healthId = `EHI-${g()}-${g()}-${g()}`
    }
    
    const profile: PatientProfile = {
      id: patientId,
      healthId: healthId,
      name: formData.name || 'Anonymous Patient',
      birthDate: formData.birthDate || '',
      gender: formData.gender as any,
      bloodGroup: formData.bloodGroup || '',
      emergencyContact: formData.emergencyContact || { name: '', relationship: '', phone: '' },
      photoUrl: null,
      address: formData.address,
      city: formData.city,
      pincode: formData.pincode,
      pastSurgeries: formData.pastSurgeries,
      organDonor: formData.organDonor as any,
      insuranceId: formData.insuranceId,
      createdAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
    }

    // Persist to store (and Dexie)
    setRole('patient')
    setPatient(profile)
    setSessionState('AUTHENTICATED')

    // Create clinical records if provided
    if (formData.conditions?.length) {
      for (const cond of formData.conditions) {
        await addCondition(patientId, {
          resourceType: 'Condition',
          id: `cond-${Math.random().toString(36).substring(7)}`,
          patientId,
          code: { text: cond },
          clinicalStatus: { coding: [{ code: 'active' }] },
          recordedDate: new Date().toISOString()
        } as any)
      }
    }

    // Final Cloud Sync (Now Supabase)
    const { syncToCloud } = useClinicalStore.getState()
    await syncToCloud(patientId)

    router.push('/dashboard')
  }

  const toggleItem = (list: string[], item: string, key: 'conditions' | 'allergies') => {
    const updated = list.includes(item) 
      ? list.filter(i => i !== item) 
      : [...list, item]
    setFormData(prev => ({ ...prev, [key]: updated }))
  }

  if (isCheckingCloud) {
    return (
      <div className="min-h-screen bg-[#080D16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#0D7377] animate-spin" />
          <p className="text-[10px] text-[#4A6075] uppercase tracking-[0.2em] animate-pulse">
            Verifying Identity...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080D16] text-[#E2EAF0] p-6 pt-12 pb-24 font-sans max-w-lg mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-[14px] font-medium tracking-[0.08em] uppercase text-[#E2EAF0]">Patient Onboarding</h1>
        <p className="text-[10px] text-[#4A6075] mt-1 tracking-[0.06em]">First login · Build your digital health identity</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex gap-2 items-center">
          {STEPS.map((step, idx) => (
            <div 
              key={step.id}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                idx < currentStep ? "w-6 bg-[#0D7377]" : 
                idx === currentStep ? "w-10 bg-[#0D7377]" : 
                "w-4 bg-white/5"
              )}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold text-[#0D7377] uppercase tracking-widest leading-none">
          {STEPS[currentStep]?.title || 'Unknown'}
        </span>
      </div>

      {/* Form Content */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Step 1: Identity */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 group cursor-pointer hover:border-[#0D7377]/50 transition-colors">
                    <Camera className="w-6 h-6 text-[#4A6075] group-hover:text-[#0D7377]" />
                    <span className="text-[8px] text-[#4A6075] uppercase group-hover:text-[#0D7377]">Photo</span>
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-medium leading-tight">Who<br/>are you?</h2>
                    <p className="text-[11px] text-[#4A6075] mt-2">This builds your health ID card.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="group">
                    <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Priya Sharma"
                      className="w-full bg-transparent border-b border-white/10 py-2 text-lg focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="group">
                      <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">Date of Birth</label>
                      <input 
                        type="date" 
                        value={formData.birthDate}
                        onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                        className="w-full bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-[#0D7377] transition-colors"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">Gender</label>
                      <select 
                        value={formData.gender}
                        onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                        className="w-full bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-[#0D7377] transition-colors"
                      >
                        <option value="male" className="bg-[#080D16]">Male</option>
                        <option value="female" className="bg-[#080D16]">Female</option>
                        <option value="other" className="bg-[#080D16]">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-[#354A5A] block">Blood Type</label>
                    <div className="flex flex-wrap gap-2">
                      {BLOOD_GROUPS.map(bg => (
                        <button
                          key={bg}
                          onClick={() => setFormData(prev => ({ ...prev, bloodGroup: bg }))}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-medium border transition-all",
                            formData.bloodGroup === bg 
                              ? "bg-[#0D7377]/10 border-[#0D7377] text-[#14A69C]" 
                              : "bg-white/5 border-white/10 text-[#4A6075] hover:border-white/20"
                          )}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium leading-tight text-white">How to<br/>reach you?</h2>
                  <p className="text-[11px] text-[#4A6075] mt-2">Used for alerts and emergency.</p>
                </div>

                <div className="space-y-4">
                  <div className="group">
                    <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">Residential Address</label>
                    <input 
                      type="text" 
                      value={formData.address}
                      onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="e.g. 12 MG Road..."
                      className="w-full bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="group">
                      <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">City</label>
                      <input 
                        type="text" 
                        value={formData.city}
                        onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="e.g. Hyderabad"
                        className="w-full bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">Pincode</label>
                      <input 
                        type="text" 
                        value={formData.pincode}
                        onChange={e => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="500001"
                        className="w-full bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <label className="text-[10px] uppercase tracking-widest text-[#E55353] font-bold">Emergency Contact</label>
                    </div>

                    <div className="space-y-4 p-5 rounded-[22px] bg-white/[0.03] border border-white/5">
                      <div className="group">
                        <label className="text-[9px] uppercase tracking-widest text-[#354A5A] mb-1 block">Contact Name</label>
                        <input 
                          type="text" 
                          value={formData.emergencyContact?.name || ''}
                          onChange={e => setFormData(prev => ({ 
                            ...prev, 
                            emergencyContact: { ...(prev.emergencyContact || { relationship: 'Other', phone: '' }), name: e.target.value } 
                          }))}
                          placeholder="Full name..."
                          className="w-full bg-transparent border-b border-white/10 py-1.5 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className="text-[9px] uppercase tracking-widest text-[#354A5A] mb-1 block">Relation</label>
                          <input 
                            type="text" 
                            value={formData.emergencyContact?.relationship}
                            onChange={e => setFormData(prev => ({ 
                              ...prev, 
                              emergencyContact: { 
                                name: prev.emergencyContact?.name || '',
                                relationship: e.target.value,
                                phone: prev.emergencyContact?.phone || ''
                              }
                            }))}
                            placeholder="e.g. Spouse"
                            className="w-full bg-transparent border-b border-white/10 py-1.5 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                          />
                        </div>
                        <div className="group">
                          <label className="text-[9px] uppercase tracking-widest text-[#354A5A] mb-1 block">Phone</label>
                          <input 
                            type="tel" 
                            value={formData.emergencyContact?.phone}
                            onChange={e => setFormData(prev => ({ 
                              ...prev, 
                              emergencyContact: { 
                                name: prev.emergencyContact?.name || '',
                                relationship: prev.emergencyContact?.relationship || '',
                                phone: e.target.value
                              }
                            }))}
                            placeholder="+91..."
                            className="w-full bg-transparent border-b border-white/10 py-1.5 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Medical */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium leading-tight text-white">Medical<br/>background.</h2>
                  <p className="text-[11px] text-[#4A6075] mt-2">Helps doctors treat you faster.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-[#354A5A] block">Known Conditions</label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_CONDITIONS.map(cond => (
                        <button
                          key={cond}
                          onClick={() => toggleItem(formData.conditions!, cond, 'conditions')}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs transition-all border",
                            formData.conditions?.includes(cond)
                              ? "bg-[#0D7377]/10 border-[#0D7377] text-[#14A69C]"
                              : "bg-white/5 border-white/5 text-[#4A6075]"
                          )}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-[#354A5A] block">Allergies</label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ALLERGIES.map(all => (
                        <button
                          key={all}
                          onClick={() => toggleItem(formData.allergies!, all, 'allergies')}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs transition-all border",
                            formData.allergies?.includes(all)
                              ? "bg-[#0D7377]/10 border-[#0D7377] text-[#14A69C]"
                              : "bg-white/5 border-white/5 text-[#4A6075]"
                          )}
                        >
                          {all}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="group">
                    <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">Past Surgeries</label>
                    <input 
                      type="text" 
                      value={formData.pastSurgeries}
                      onChange={e => setFormData(prev => ({ ...prev, pastSurgeries: e.target.value }))}
                      placeholder="e.g. Appendectomy 2018..."
                      className="w-full bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest text-[#354A5A] block">Organ Donor</label>
                      <div className="flex gap-2">
                        {['Yes', 'No'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setFormData(prev => ({ ...prev, organDonor: opt as any }))}
                            className={cn(
                              "flex-1 py-2 rounded-xl text-xs transition-all border",
                              formData.organDonor === opt
                                ? "bg-[#0D7377]/10 border-[#0D7377] text-[#14A69C]"
                                : "bg-white/5 border-white/5 text-[#4A6075]"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-[10px] uppercase tracking-widest text-[#354A5A] mb-1 block">Insurance ID</label>
                      <input 
                        type="text" 
                        value={formData.insuranceId}
                        onChange={e => setFormData(prev => ({ ...prev, insuranceId: e.target.value }))}
                        placeholder="e.g. STAR-2024..."
                        className="w-full bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-[#0D7377] transition-colors placeholder:text-white/5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Preview */}
            {currentStep === 3 && (
              <div className="space-y-10 flex flex-col items-center">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17C3B2]/10 border border-[#17C3B2]/20 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#17C3B2] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#17C3B2] uppercase tracking-[0.08em]">Verification Ready</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Your Health Identity</h2>
                  <p className="text-[11px] text-[#4A6075] mt-2">Personalized digital health ID generated.</p>
                </div>

                <DigitalHealthCard 
                  name={formData.name || 'New Patient'}
                  healthId={formData.healthId || 'EHI-EHI0-0004-681'}
                  bloodGroup={formData.bloodGroup || 'B+'}
                  birthDate={formData.birthDate || '1990-01-01'}
                  emergencyPhone={formData.emergencyContact?.phone || '+91 98765 43210'}
                />

                <div className="w-full p-5 rounded-[26px] bg-white/[0.03] border border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0D7377]" />
                    <div>
                      <p className="text-xs font-semibold text-white">Decentralized Storage</p>
                      <p className="text-[10px] text-[#4A6075]">Profile encrypted and stored only in your browser.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0D7377]" />
                    <div>
                      <p className="text-xs font-semibold text-white">Emergency Activation</p>
                      <p className="text-[10px] text-[#4A6075]">Identity visible to emergency responders via EHI Bridge.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#080D16] via-[#080D16] to-transparent">
        <div className="max-w-lg mx-auto flex gap-4">
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <button 
              onClick={handleBack}
              className="flex-1 p-4 rounded-2xl bg-white/[0.05] border border-white/10 text-[#4A6075] text-sm font-medium hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button 
            onClick={handleNext}
            className="flex-[2] p-4 rounded-2xl bg-[#0D7377] text-white text-sm font-bold shadow-lg shadow-[#0D7377]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {currentStep === STEPS.length - 1 ? 'Start Dashboard' : 'Continue'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
