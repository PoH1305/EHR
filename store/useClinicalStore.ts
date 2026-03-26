'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { db } from '@/lib/db'
import { useUserStore } from './useUserStore'
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
  syncToCloud: (patientId: string) => Promise<void>
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
            // Check Supabase (formerly Firestore)
            const { supabase } = await import('@/lib/supabase')
            if (supabase) {
              const { data, error } = await supabase
                .from('profiles')
                .select('data')
                .eq('id', patientId)
                .maybeSingle()
              
              if (error) {
                console.error('[ClinicalStore] Error fetching cloud profile:', error)
              } else if (data && data.data) {
                profile = data.data as any
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
        
        const timeoutId = setTimeout(() => {
          if (get().isLoading) {
            console.warn('[ClinicalStore] loadClinicalData timed out')
            set({ isLoading: false })
          }
        }, 10000)

        try {
          const { firebaseUid, role } = useUserStore.getState()
          const { supabase } = await import('@/lib/supabase')
          
          let approvedCats: string[] | null = null
          
          // 1. If Doctor, get the approved categories first
          if (role === 'doctor' && firebaseUid && supabase) {
            const { data: accessData } = await supabase
              .from('access_requests')
              .select('shared_categories')
              .eq('doctor_id', firebaseUid)
              .eq('patient_id', patientId)
              .eq('status', 'APPROVED')
              .maybeSingle()
            
            if (accessData) {
              approvedCats = accessData.shared_categories
            } else {
              // Strictly forbid access if no approved request exists
              console.warn('[ClinicalStore] Access denied: No approved request found for doctor.')
              set({ isLoading: false, vitals: [], conditions: [], medications: [], allergies: [], clinicalNotes: [], medicalImages: [], attachments: [], riskAnalyses: [] })
              clearTimeout(timeoutId)
              return
            }
          }

          const isAllowed = (cat: string) => role === 'patient' || (approvedCats && approvedCats.includes(cat))

          // 2. Conditional Fetching (Performance & Privacy)
          const [vitals, conditions, medications, allergies, clinicalNotes, medicalImages, riskAnalyses, attachments] = await Promise.all([
            isAllowed('vitals') ? db.vitals.where('patientId').equals(patientId).toArray() : Promise.resolve([]),
            isAllowed('conditions') ? db.conditions.where('patientId').equals(patientId).toArray() : Promise.resolve([]),
            isAllowed('medications') ? db.medications.where('patientId').equals(patientId).toArray() : Promise.resolve([]),
            isAllowed('allergies') ? db.allergies.where('patientId').equals(patientId).toArray() : Promise.resolve([]),
            isAllowed('clinicalNotes') ? db.clinical_notes.where('patientId').equals(patientId).toArray() : Promise.resolve([]),
            isAllowed('medicalImages') ? db.medical_images.where('patientId').equals(patientId).toArray() : Promise.resolve([]),
            isAllowed('riskAnalyses') ? db.risk_analysis.where('patientId').equals(patientId).toArray() : Promise.resolve([]),
            isAllowed('attachments') ? db.patient_attachments.where('patientId').equals(patientId).toArray() : Promise.resolve([])
          ])

          const isMinimization = get().isMinimizationActive

          // 3. Cloud Fallback (Strictly Scoped)
          if (vitals.length === 0 && conditions.length === 0 && clinicalNotes.length === 0 && supabase) {
            const { data, error } = await supabase
              .from('clinical_data')
              .select('data, last_synced_at')
              .eq('patient_id', patientId)
              .maybeSingle()
              
            if (data?.data) {
              const cloudData = data.data
              set((state) => {
                state.vitals = isAllowed('vitals') ? (cloudData.vitals || []) : []
                state.conditions = isAllowed('conditions') ? (cloudData.conditions || []) : []
                state.medications = isAllowed('medications') ? (cloudData.medications || []) : []
                state.allergies = isAllowed('allergies') ? (cloudData.allergies || []) : []
                state.clinicalNotes = isAllowed('clinicalNotes') ? (cloudData.clinicalNotes || []) : []
                state.medicalImages = isAllowed('medicalImages') ? (cloudData.medicalImages || []) : []
                state.attachments = isAllowed('attachments') ? (cloudData.attachments || []) : []
                state.riskAnalyses = isAllowed('riskAnalyses') ? (cloudData.riskAnalyses || []) : []
                state.isLoading = false
                state.lastUpdated = data.last_synced_at
              })
              clearTimeout(timeoutId)
              return
            }
          }

          set((state) => {
            state.vitals = isMinimization ? (vitals as any[]).slice(-4) : (vitals as any[])
            state.conditions = isMinimization 
              ? (conditions as any[]).filter(c => c.clinicalStatus === 'active') 
              : (conditions as any[])
            state.medications = medications as any[]
            state.allergies = allergies as any[]
            state.clinicalNotes = isMinimization ? (clinicalNotes as any[]).slice(-2) : (clinicalNotes as any[])
            state.medicalImages = isMinimization ? [] : (medicalImages as any[])
            state.attachments = attachments as any[]
            state.riskAnalyses = riskAnalyses as any[]
            state.isLoading = false
            state.lastUpdated = new Date().toISOString()
          })
          clearTimeout(timeoutId)
        } catch (error) {
          clearTimeout(timeoutId)
          console.error('[ClinicalStore] Load error:', error)
          set({ isLoading: false })
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
        if (db) await db.vitals.add(vitalWithId)
        set((state) => {
          state.vitals.push(vital)
        })
        void get().syncToCloud(patientId)
      },

      addCondition: async (patientId: string, condition: Condition) => {
        const condWithId = { ...condition, patientId }
        if (db) await db.conditions.add(condWithId)
        set((state) => {
          state.conditions.push(condition)
        })
        void get().syncToCloud(patientId)
      },

      addMedication: async (patientId: string, medication: MedicationRequest) => {
        const medWithId = { ...medication, patientId }
        if (db) await db.medications.add(medWithId)
        set((state) => {
          state.medications.push(medication)
        })
        void get().syncToCloud(patientId)
      },

      addObservation: async (patientId: string, observation: any) => {
        const obsWithId = { ...observation, patientId }
        if (db) await db.observations.add(obsWithId)
        set((state) => {
          state.observations.push(observation)
        })
        void get().syncToCloud(patientId)
      },

      addDiagnosticReport: async (patientId: string, report: any) => {
        const reportWithId = { ...report, patientId }
        if (db) await db.diagnostic_reports.add(reportWithId)
        set((state) => {
          state.diagnosticReports.push(report)
        })
        void get().syncToCloud(patientId)
      },

      addImmunization: async (patientId: string, immunization: any) => {
        const immWithId = { ...immunization, patientId }
        if (db) await db.immunizations.add(immWithId)
        set((state) => {
          state.immunizations.push(immunization)
        })
        void get().syncToCloud(patientId)
      },

      addProcedure: async (patientId: string, procedure: any) => {
        const procWithId = { ...procedure, patientId }
        if (db) await db.procedures.add(procWithId)
        set((state) => {
          state.procedures.push(procedure)
        })
        void get().syncToCloud(patientId)
      },

      addClinicalNote: async (note: ClinicalNote) => {
        if (db) await db.clinical_notes.add(note)
        set((state) => {
          state.clinicalNotes.unshift(note)
        })
        void get().syncToCloud(note.patientId)
      },

      addMedicalImage: async (image: MedicalImage) => {
        let finalImage = { ...image }
        
        // Upload to Cloud if it's a local blob
        if (image.imageUrl.startsWith('blob:') || image.imageUrl.startsWith('data:')) {
          try {
            const { uploadMedicalFile, blobUrlToBlob } = await import('@/lib/cloudStorage')
            const blob = await blobUrlToBlob(image.imageUrl)
            const cloudUrl = await uploadMedicalFile(image.patientId, image.id, blob)
            finalImage.imageUrl = cloudUrl
          } catch (error) {
            console.error('[ClinicalStore] Failed to upload image to Cloud:', error)
          }
        }

        if (db) await db.medical_images.add(finalImage)
        set((state) => {
          state.medicalImages.unshift(finalImage)
        })
        void get().syncToCloud(finalImage.patientId)
      },

      addRiskAnalysis: async (analysis: RiskAnalysis) => {
        if (db) await db.risk_analysis.add(analysis)
        set((state) => {
          state.riskAnalyses.unshift(analysis)
        })
        void get().syncToCloud(analysis.patientId)
      },

      addAttachment: async (attachment: PatientAttachment) => {
        let finalAttachment = { ...attachment }

        // Upload to Cloud if it's a local blob
        if (attachment.fileUrl.startsWith('blob:') || attachment.fileUrl.startsWith('data:')) {
          try {
            const { uploadMedicalFile, blobUrlToBlob } = await import('@/lib/cloudStorage')
            const blob = await blobUrlToBlob(attachment.fileUrl)
            const cloudUrl = await uploadMedicalFile(attachment.patientId, attachment.id, blob)
            finalAttachment.fileUrl = cloudUrl
          } catch (error) {
            console.error('[ClinicalStore] Failed to upload attachment to Cloud:', error)
          }
        }

        if (db) await db.patient_attachments.add(finalAttachment)
        set((state) => {
          state.attachments.unshift(finalAttachment)
        })
        void get().syncToCloud(finalAttachment.patientId)
      },

      addAuditEvent: async (event: AuditEvent) => {
        if (db) await db.audit_log.add(event)
        set((state) => {
          state.auditEvents.unshift(event)
        })
        // Audit log sync is less critical for the patient profile fallback
        // but can be added if needed.
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

      syncToCloud: async (patientId: string) => {
        try {
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) return

          const state = get()
          const { error } = await supabase
            .from('clinical_data')
            .upsert({
              patient_id: patientId,
              data: {
                vitals: state.vitals,
                conditions: state.conditions,
                medications: state.medications,
                allergies: state.allergies,
                observations: state.observations,
                diagnosticReports: state.diagnosticReports,
                immunizations: state.immunizations,
                procedures: state.procedures,
                clinicalNotes: state.clinicalNotes,
                medicalImages: state.medicalImages,
                riskAnalyses: state.riskAnalyses,
                attachments: state.attachments,
              },
              last_synced_at: new Date().toISOString()
            })

          if (error) {
            console.error('[ClinicalStore] Supabase Upsert Error details:', error.message, error.details, error.hint)
            throw error
          }
          
          set((state) => {
            state.lastUpdated = new Date().toISOString()
          })
          console.log('[ClinicalStore] Successfully synced to Supabase for:', patientId)
        } catch (error) {
          console.error('[ClinicalStore] Supabase Sync Error:', error)
          throw error
        }
      },

      loadSharedClinicalData: async (tokenHash: string, handshakeKey: string) => {
        try {
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) return

          set((state) => { state.isLoading = true })
          
          const { data, error } = await supabase
            .from('shared_secrets')
            .select('bundle')
            .eq('id', tokenHash)
            .single()

          if (error) throw error

          if (data && data.bundle) {
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
            console.log('[ClinicalStore] Successfully loaded and decrypted shared records from Supabase')
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
