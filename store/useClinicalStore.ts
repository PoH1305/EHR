'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { db } from '@/lib/db'
import type { 
  VitalSeries, 
  AuditEvent, 
  ClinicalNote, 
  MedicalImage, 
  RiskAnalysis,
  PatientAttachment
} from '@/lib/types'
import type { Condition, MedicationRequest, AllergyIntolerance } from 'fhir/r4'

interface ClinicalState {
  vitals: VitalSeries[]
  conditions: Condition[]
  medications: MedicationRequest[]
  allergies: AllergyIntolerance[]
  observations: any[]
  diagnosticReports: any[]
  immunizations: any[]
  procedures: any[]
  clinicalNotes: ClinicalNote[]
  medicalImages: MedicalImage[]
  riskAnalyses: RiskAnalysis[]
  attachments: PatientAttachment[]
  auditEvents: AuditEvent[]
  isLoading: boolean
  isEmergencyMode: boolean
  isMinimizationActive: boolean
  emergencyPatientId: string | null
  selectedPatientProfile: any | null
  lastUpdated: string | null
}

interface ClinicalActions {
  loadClinicalData: (patientId: string) => Promise<void>
  loadPatientMetadata: (patientId: string) => Promise<void>
  loadAuditLog: (userId: string) => Promise<void>
  addVital: (patientId: string, vital: VitalSeries) => Promise<void>
  addCondition: (patientId: string, condition: Condition) => Promise<void>
  addMedication: (patientId: string, medication: MedicationRequest) => Promise<void>
  addObservation: (patientId: string, observation: any) => Promise<void>
  addDiagnosticReport: (patientId: string, report: any) => Promise<void>
  addImmunization: (patientId: string, immunization: any) => Promise<void>
  addProcedure: (patientId: string, procedure: any) => Promise<void>
  addClinicalNote: (note: ClinicalNote) => Promise<void>
  addMedicalImage: (image: MedicalImage) => Promise<void>
  addRiskAnalysis: (analysis: RiskAnalysis) => Promise<void>
  addAttachment: (attachment: PatientAttachment) => Promise<void>
  addAuditEvent: (event: AuditEvent) => Promise<void>
  activateEmergencyMode: (patientId: string) => void
  clearEmergencyMode: () => void
  clearClinicalState: () => void
  syncToFirestore: (patientId: string) => Promise<void>
  loadSharedClinicalData: (tokenHash: string, handshakeKey: string) => Promise<void>
}

export const useClinicalStore = create<ClinicalState & ClinicalActions>()(
  devtools(
    immer((set, get) => ({
      // State
      vitals: [],
      conditions: [],
      medications: [],
      allergies: [],
      observations: [],
      diagnosticReports: [],
      immunizations: [],
      procedures: [],
      clinicalNotes: [],
      medicalImages: [],
      riskAnalyses: [],
      attachments: [],
      auditEvents: [],
      isLoading: false,
      isEmergencyMode: false,
      isMinimizationActive: true, // Default to true for Phase 10 demo
      emergencyPatientId: null,
      selectedPatientProfile: null,
      lastUpdated: null,

      // Actions
      activateEmergencyMode: (patientId: string) => {
        set((state) => {
          state.isEmergencyMode = true
          state.emergencyPatientId = patientId
        })
      },

      clearEmergencyMode: () => {
        set((state) => {
          state.isEmergencyMode = false
          state.emergencyPatientId = null
        })
      },

      loadPatientMetadata: async (patientId: string) => {
        if (!db) return
        try {
          // Check local Dexie first
          let profile = await db.patient_profiles.get(patientId)
          
          if (!profile) {
            // Check Firestore
            const { db_firestore } = await import('@/lib/firebase')
            const { doc, getDoc } = await import('firebase/firestore')
            if (db_firestore) {
              const docSnap = await getDoc(doc(db_firestore, 'patients', patientId))
              if (docSnap.exists()) {
                profile = docSnap.data() as any
              }
            }
          }

          set((state) => {
            state.selectedPatientProfile = profile || null
          })
        } catch (error) {
          console.error('Failed to load patient metadata:', error)
        }
      },

      loadClinicalData: async (patientId: string) => {
        if (typeof window === 'undefined' || !db) return
        set((state) => { state.isLoading = true })
        
        try {
          const [vitals, conditions, medications, allergies, clinicalNotes, medicalImages, riskAnalyses, attachments] = await Promise.all([
            db.vitals.where('patientId').equals(patientId).toArray(),
            db.conditions.where('patientId').equals(patientId).toArray(),
            db.medications.where('patientId').equals(patientId).toArray(),
            db.allergies.where('patientId').equals(patientId).toArray(),
            db.clinical_notes.where('patientId').equals(patientId).toArray(),
            db.medical_images.where('patientId').equals(patientId).toArray(),
            db.risk_analysis.where('patientId').equals(patientId).toArray(),
            db.patient_attachments.where('patientId').equals(patientId).toArray()
          ])

          const isMinimization = get().isMinimizationActive

          set((state) => {
            state.vitals = isMinimization ? vitals.slice(-4) : vitals
            state.conditions = isMinimization 
              ? conditions.filter(c => typeof c.clinicalStatus === 'string' ? c.clinicalStatus === 'active' : (c.clinicalStatus as any)?.coding?.[0]?.code === 'active') // eslint-disable-line @typescript-eslint/no-explicit-any
              : conditions
            state.medications = isMinimization ? medications.filter(m => m.status === 'active') : medications
            state.allergies = allergies
            state.clinicalNotes = isMinimization ? clinicalNotes.slice(-2) : clinicalNotes
            state.medicalImages = isMinimization ? [] : medicalImages
            state.riskAnalyses = riskAnalyses
            state.attachments = (attachments as any[]) || []
            state.isLoading = false
            state.lastUpdated = new Date().toISOString()
          })
        } catch (error) {
          console.error('Failed to load clinical data from Dexie:', error)
          set((state) => { state.isLoading = false })
        }
      },

      loadAuditLog: async (userId: string) => {
        const events = await db.audit_log.where('userId').equals(userId).toArray()
        set((state) => {
          state.auditEvents = events.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        })
      },

      addVital: async (patientId: string, vital: VitalSeries) => {
        const vitalWithId = { ...vital, patientId }
        await db.vitals.add(vitalWithId)
        set((state) => {
          state.vitals.push(vital)
        })
      },

      addCondition: async (patientId: string, condition: Condition) => {
        const condWithId = { ...condition, patientId }
        await db.conditions.add(condWithId)
        set((state) => {
          state.conditions.push(condition)
        })
      },

      addMedication: async (patientId: string, medication: MedicationRequest) => {
        const medWithId = { ...medication, patientId }
        await db.medications.add(medWithId)
        set((state) => {
          state.medications.push(medication)
        })
      },

      addObservation: async (patientId: string, observation: any) => {
        const obsWithId = { ...observation, patientId }
        await db.observations.add(obsWithId)
        set((state) => {
          state.observations.push(observation)
        })
      },

      addDiagnosticReport: async (patientId: string, report: any) => {
        const reportWithId = { ...report, patientId }
        await db.diagnostic_reports.add(reportWithId)
        set((state) => {
          state.diagnosticReports.push(report)
        })
      },

      addImmunization: async (patientId: string, immunization: any) => {
        const immWithId = { ...immunization, patientId }
        await db.immunizations.add(immWithId)
        set((state) => {
          state.immunizations.push(immunization)
        })
      },

      addProcedure: async (patientId: string, procedure: any) => {
        const procWithId = { ...procedure, patientId }
        await db.procedures.add(procWithId)
        set((state) => {
          state.procedures.push(procedure)
        })
      },

      addClinicalNote: async (note: ClinicalNote) => {
        await db.clinical_notes.add(note)
        set((state) => {
          state.clinicalNotes.unshift(note)
        })
      },

      addMedicalImage: async (image: MedicalImage) => {
        await db.medical_images.add(image)
        set((state) => {
          state.medicalImages.unshift(image)
        })
      },

      addRiskAnalysis: async (analysis: RiskAnalysis) => {
        await db.risk_analysis.add(analysis)
        set((state) => {
          state.riskAnalyses.unshift(analysis)
        })
      },

      addAttachment: async (attachment: PatientAttachment) => {
        if (!db) return
        await db.patient_attachments.add(attachment)
        set((state) => {
          state.attachments.unshift(attachment)
        })
      },

      addAuditEvent: async (event: AuditEvent) => {
        await db.audit_log.add(event)
        set((state) => {
          state.auditEvents.unshift(event)
        })
      },

      clearClinicalState: () => {
        set((state) => {
          state.vitals = []
          state.conditions = []
          state.medications = []
          state.allergies = []
          state.observations = []
          state.diagnosticReports = []
          state.immunizations = []
          state.procedures = []
          state.clinicalNotes = []
          state.medicalImages = []
          state.riskAnalyses = []
          state.lastUpdated = null
        })
      },

      syncToFirestore: async (patientId: string) => {
        const { db_firestore } = await import('@/lib/firebase')
        if (!db_firestore) return

        const state = get()
        try {
          const { doc, setDoc } = await import('firebase/firestore')
          
          await setDoc(doc(db_firestore, 'patients', patientId), {
            vitals: state.vitals,
            conditions: state.conditions,
            clinicalNotes: state.clinicalNotes,
            lastSyncedAt: new Date().toISOString()
          }, { merge: true })
          
          set((state) => {
            state.lastUpdated = new Date().toISOString()
          })
          console.log('Successfully synced to Firestore')
        } catch (error) {
          console.error('Firestore Sync Error:', error)
          throw error
        }
      },

      loadSharedClinicalData: async (tokenHash: string, handshakeKey: string) => {
        const { db_firestore } = await import('@/lib/firebase')
        if (!db_firestore) return

        set((state) => { state.isLoading = true })
        try {
          const { doc, getDoc } = await import('firebase/firestore')
          const docRef = doc(db_firestore, 'shared_secrets', tokenHash)
          const docSnap = await getDoc(docRef)

          if (docSnap.exists()) {
            const data = docSnap.data()
            const encryptedBundle = data.bundle
            
            // Decrypt the bundle using the handshakeKey
            const { decryptBundle } = await import('@/lib/crypto')
            const bundle = await decryptBundle(encryptedBundle, handshakeKey)

            set((state) => {
              state.vitals = bundle.vitals || []
              state.conditions = bundle.conditions || []
              state.clinicalNotes = bundle.clinicalNotes || []
              state.isLoading = false
            })
            console.log('Successfully loaded and decrypted shared records from Firestore')
          } else {
            throw new Error('Shared record not found or expired')
          }
        } catch (error) {
          console.error('Failed to load shared clinical data:', error)
          set((state) => { state.isLoading = false })
          throw error
        }
      }
    })),
    { name: 'ClinicalStore' }
  )
)
