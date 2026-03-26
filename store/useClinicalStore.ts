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
  isLoaded: boolean
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
  syncToCloud: (patientId?: string) => Promise<void>
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
      isLoaded: false,
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
        
        // Skip if already loading — prevents parallel duplicate Supabase calls
        if (get().isLoading) {
          console.log('[ClinicalStore] Skipping duplicate loadClinicalData call for:', patientId)
          return
        }
        
        set((state) => { state.isLoading = true })
        
        // Safety timeout to prevent permanent loading hangs
        const timeoutId = setTimeout(() => {
          if (get().isLoading) {
            console.warn('[ClinicalStore] loadClinicalData timed out after 10s')
            set({ isLoading: false })
          }
        }, 10000)

        try {
          const { firebaseUid, role } = useUserStore.getState()
          const { supabase } = await import('@/lib/supabase')
          
          let sharedCats: string[] | null = null
          
          // 1. If Doctor, find the APPROVED access request to get shared categories
          if (role === 'doctor' && firebaseUid && supabase) {
            const { data: accessData } = await supabase
              .from('access_requests')
              .select('shared_categories')
              .eq('doctor_id', firebaseUid)
              .eq('patient_id', patientId)
              .eq('status', 'APPROVED')
              .maybeSingle()
            
            if (accessData) {
              sharedCats = accessData.shared_categories
              console.log('[ClinicalStore] Filtering records by shared categories:', sharedCats)
            }
          }

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

          // Fallback: If local is empty, try Cloud (Supabase)
          if (vitals.length === 0 && conditions.length === 0 && clinicalNotes.length === 0) {
            console.log('[ClinicalStore] Local storage empty, checking Cloud (Supabase)...')
            
            if (supabase) {
              const { data, error } = await supabase
                .from('clinical_data')
                .select('data, last_synced_at')
                .eq('patient_id', patientId)
                .maybeSingle()
                
              if (error) throw error

              if (data && data.data) {
                const cloudData = data.data
                set((state) => {
                  state.vitals = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('vitals')) ? (cloudData.vitals || []) : []
                  state.conditions = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('conditions')) ? (cloudData.conditions || []) : []
                  state.medications = (!sharedCats || sharedCats.length === 0 || sharedCats.length === 0 || sharedCats.includes('medications')) ? (cloudData.medications || []) : []
                  state.allergies = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('allergies')) ? (cloudData.allergies || []) : []
                  state.clinicalNotes = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('clinicalNotes')) ? (cloudData.clinicalNotes || []) : []
                  state.medicalImages = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('medicalImages')) ? (cloudData.medicalImages || []) : []
                  state.attachments = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('attachments')) ? (cloudData.attachments || []) : []
                  state.riskAnalyses = cloudData.riskAnalyses || []
                  state.isLoading = false
                  state.lastUpdated = data.last_synced_at
                })
                clearTimeout(timeoutId)
                return
              }
            }
          }

          set((state) => {
            state.vitals = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('vitals')) 
              ? (isMinimization ? vitals.slice(-4) : vitals) 
              : []
            state.conditions = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('conditions'))
              ? (isMinimization 
                  ? conditions.filter(c => typeof c.clinicalStatus === 'string' ? c.clinicalStatus === 'active' : (c.clinicalStatus as any)?.coding?.[0]?.code === 'active') // eslint-disable-line @typescript-eslint/no-explicit-any
                  : conditions)
              : []
            state.medications = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('medications'))
              ? (isMinimization ? medications.filter(m => m.status === 'active') : medications)
              : []
            state.allergies = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('allergies')) ? allergies : []
            state.clinicalNotes = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('clinicalNotes'))
              ? (isMinimization ? clinicalNotes.slice(-2) : clinicalNotes)
              : []
            state.medicalImages = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('medicalImages'))
              ? (isMinimization ? [] : medicalImages)
              : []
            state.attachments = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('attachments')) ? (attachments as any[]) : []
            state.riskAnalyses = riskAnalyses
            state.isLoading = false
            state.isLoaded = true // Set safety flag
            state.lastUpdated = new Date().toISOString()
          })
          clearTimeout(timeoutId)
        } catch (error) {
          clearTimeout(timeoutId)
          console.error('Failed to load clinical data:', error)
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

      syncToCloud: async (explicitPatientId?: string) => {
        const { patient, firebaseUid } = useUserStore.getState()
        
        // Safety lock: Don't sync if store isn't loaded yet (prevents blanking cloud data)
        if (!get().isLoaded && !explicitPatientId) {
          console.warn('[ClinicalStore] Skipping sync: Store not loaded yet.')
          return
        }

        // UNIFIED KEY: We always use the healthId (EHI ID) for clinical data shards
        const targetId = explicitPatientId || patient?.healthId
        if (!targetId) {
          console.warn('[ClinicalStore] Skipping sync: No target ID (healthId) found.')
          return
        }

        try {
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) return

          const state = get()
          const { error } = await supabase
            .from('clinical_data')
            .upsert({
              patient_id: targetId,
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
          console.log('[ClinicalStore] Successfully synced to Supabase for:', targetId)
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
