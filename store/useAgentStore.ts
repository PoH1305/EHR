'use client'

import { create } from 'zustand'
import { db } from '@/lib/db'

interface AgentState {
  isGuardianActive: boolean
  isSuspicious: boolean
  lastAnomaly: string | null
  priorityQueue: { patientId: string; name: string; reason: string; severity: 'high' | 'medium' }[]
  
  // Guardian Actions
  checkSecurityPulse: () => Promise<void>
  
  // Triage Actions
  runClinicalTriage: () => Promise<void>
  
  // Minimization Actions
  getMinimizationSuggestion: (requestId: string) => Promise<{ scope: string[]; reasoning: string } | null>
}

export const useAgentStore = create<AgentState>((set) => ({
  isGuardianActive: true,
  isSuspicious: false,
  lastAnomaly: null,
  priorityQueue: [],

  checkSecurityPulse: async () => {
    if (!db) return
    
    // Guardian Logic: Check audit logs for high frequency access
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const recentEvents = await db.audit_log
      .where('timestamp')
      .above(oneMinuteAgo)
      .toArray()
      
    if (recentEvents.length > 15) {
      set({ 
        isSuspicious: true, 
        lastAnomaly: `High frequency access detected: ${recentEvents.length} events in 60s` 
      })
    } else {
      set({ isSuspicious: false, lastAnomaly: null })
    }
  },

  runClinicalTriage: async () => {
    if (!db) return
    
    const patients = await db.patient_profiles.toArray()
    const newQueue: AgentState['priorityQueue'] = []
    
    for (const patient of patients) {
      // Triage Logic: Check for hypertensive patterns in systolic BP
      // Note: Dexie filter is used as 'type' is not indexed in some versions, 
      // but here we filter on the result accurately.
      const vitals = await db.vitals
        .where('patientId')
        .equals(patient.id)
        .toArray()
        
      const bpVitals = vitals.filter(v => v.type === 'bloodPressureSystolic')
      
      if (bpVitals.length > 0) {
        // Sort by timestamp if possible, here we assume latestValue is current
        const lastValue = bpVitals[0]?.latestValue
        if (lastValue && lastValue > 140) {
          newQueue.push({
            patientId: patient.id,
            name: patient.name,
            reason: `Elevated Systolic BP detected (${lastValue} mmHg). Trend is ${bpVitals[0]?.trend || 'stable'}.`,
            severity: lastValue > 160 ? 'high' : 'medium'
          })
        }
      }
    }
    
    set({ priorityQueue: newQueue })
  },

  getMinimizationSuggestion: async (requestId: string) => {
    if (!db) return null
    
    const request = await db.access_requests.get(requestId)
    if (!request) return null
    
    // Smart Minimization Logic
    // In a real app, this would use an LLM or cross-reference a Provider Registry
    const docName = request.doctorName.toLowerCase()
    
    if (docName.includes('cardio')) {
      return {
        scope: ['vitals', 'conditions'],
        reasoning: "Dr. " + request.doctorName + " is a Cardiologist. They typically only require Vitals and Heart-related conditions for consultation."
      }
    }
    
    if (docName.includes('derm') || docName.includes('skin')) {
      return {
        scope: ['images', 'allergies'],
        reasoning: "Dermatological consults primarily focus on Medical Images and Allergy history."
      }
    }

    return {
      scope: ['vitals', 'records', 'notes'],
      reasoning: "General consultation suggested scope: Vitals, Records, and Clinical Notes."
    }
  }
}))
