'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { db } from '@/lib/db'
import { useUserStore } from './useUserStore'
import { supabase } from '@/lib/supabase'
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
  addAuditEvent: (event: Omit<AuditEvent, 'hash' | 'previousHash'>, patientId?: string) => Promise<void>
  setEmergencyMode: (active: boolean) => void
  activateEmergencyMode: (patientId: string) => void
  clearEmergencyMode: () => void
  clearClinicalState: () => void
  syncToCloud: (patientId?: string) => Promise<void>
  syncAtomic: (patientId: string, key: string, value: any) => Promise<void>
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
      isMinimizationActive: true, 
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
          let profile = await db.patient_profiles.get(patientId)
          
          if (!profile) {
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
        
        if (get().isLoading) {
          console.log('[ClinicalStore] Skipping duplicate loadClinicalData call for:', patientId)
          return
        }
        
        set((state) => { state.isLoading = true; state.isLoaded = false })
        
        const timeoutId = setTimeout(() => {
          if (get().isLoading) {
            console.warn('[ClinicalStore] loadClinicalData timed out after 10s')
            set({ isLoading: false })
          }
        }, 10000)

        try {
          const { firebaseUid, role } = useUserStore.getState()
          
          let sharedCats: string[] | null = null
          
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

          const [vitals, conditions, medications, allergies, clinicalNotes, medicalImages, riskAnalyses, attachments, auditEvents] = await Promise.all([
            db.vitals.where('patientId').equals(patientId).toArray(),
            db.conditions.where('patientId').equals(patientId).toArray(),
            db.medications.where('patientId').equals(patientId).toArray(),
            db.allergies.where('patientId').equals(patientId).toArray(),
            db.clinical_notes.where('patientId').equals(patientId).toArray(),
            db.medical_images.where('patientId').equals(patientId).toArray(),
            db.risk_analysis.where('patientId').equals(patientId).toArray(),
            db.patient_attachments.where('patientId').equals(patientId).toArray(),
            db.audit_log.where('userId').equals(patientId).toArray()
          ])

          const isMinimization = get().isMinimizationActive
          
          // ALWAYS check Cloud (Supabase) in background if we are a patient to catch doctor uploads
          if (supabase) {
            console.log('[ClinicalStore] Checking Cloud (Supabase) for updates...')
            const { data: cloudRow, error } = await supabase
              .from('clinical_data')
              .select('data, last_synced_at')
              .eq('patient_id', patientId)
              .maybeSingle()
              
            if (!error && cloudRow?.data) {
              const cloudData = cloudRow.data
              
              // 1. Merge new attachments into Dexie
              if (cloudData.attachments && Array.isArray(cloudData.attachments)) {
                for (const att of cloudData.attachments) {
                  const exists = attachments.some(a => a.id === att.id)
                  if (!exists && db) {
                    await db.patient_attachments.add(att)
                    attachments.push(att) // Update local list
                  }
                }
              }

              // 2. If local store was effectively empty, perform initial projection from cloud
              if (vitals.length === 0 && conditions.length === 0 && clinicalNotes.length === 0) {
                set((state) => {
                  state.vitals = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('vitals')) ? (cloudData.vitals || []) : []
                  state.conditions = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('conditions')) ? (cloudData.conditions || []) : []
                  state.medications = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('medications')) ? (cloudData.medications || []) : []
                  state.allergies = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('allergies')) ? (cloudData.allergies || []) : []
                  state.clinicalNotes = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('clinicalNotes')) ? (cloudData.clinicalNotes || []) : []
                  state.medicalImages = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('medicalImages')) ? (cloudData.medicalImages || []) : []
                  state.attachments = (!sharedCats || sharedCats.length === 0 || sharedCats.includes('attachments')) ? (cloudData.attachments || []) : []
                  state.auditEvents = cloudData.auditEvents || []
                  state.riskAnalyses = cloudData.riskAnalyses || []
                  state.isLoading = false
                  state.isLoaded = true
                  state.lastUpdated = cloudRow.last_synced_at
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
                  ? conditions.filter(c => typeof c.clinicalStatus === 'string' ? c.clinicalStatus === 'active' : (c.clinicalStatus as any)?.coding?.[0]?.code === 'active')
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
            state.auditEvents = (auditEvents as any[]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            state.riskAnalyses = riskAnalyses
            state.isLoading = false
            state.isLoaded = true
            state.lastUpdated = new Date().toISOString()
          })
          clearTimeout(timeoutId)

          // 3. Real-time "Pulse" Listener for Patients (to detect doctor uploads)
          if (role !== 'doctor' && supabase) {
            try {
              const channelName = `clinical-pulse:${patientId}`
              const existingChannel = supabase.channel(channelName)
              await supabase.removeChannel(existingChannel)
              
              supabase
                .channel(channelName)
                .on('postgres_changes', {
                  event: '*',
                  schema: 'public',
                  table: 'clinical_data',
                  filter: `patient_id=eq.${patientId}`
                }, (payload) => {
                  console.log('[ClinicalPulse] Change detected in cloud vault, re-syncing...')
                  const fetchAndMerge = async () => {
                    const { data: updatedCloud } = await supabase
                      .from('clinical_data')
                      .select('data')
                      .eq('patient_id', patientId)
                      .maybeSingle()
                    
                    if (updatedCloud?.data?.attachments) {
                      const newAtts: PatientAttachment[] = updatedCloud.data.attachments || []
                      set((state) => {
                        const localIds = new Set(state.attachments.map(a => a.id))
                        const merged = newAtts.filter(a => !localIds.has(a.id))
                        if (merged.length > 0) {
                          console.log(`[ClinicalPulse] Merged ${merged.length} new cloud attachments`)
                          state.attachments = [...state.attachments, ...merged]
                          if (db) {
                            merged.forEach(m => void db.patient_attachments.put(m))
                          }
                        }
                      })
                    }
                  }
                  void fetchAndMerge()
                })
                .subscribe()

              // Initial merge on load
              const { data: cloudRec } = await supabase
                .from('clinical_data')
                .select('data')
                .eq('patient_id', patientId)
                .maybeSingle()

              if (cloudRec?.data?.attachments) {
                const cloudAtts: PatientAttachment[] = cloudRec.data.attachments || []
                const currentAtts = get().attachments
                const localIds = new Set(currentAtts.map((a: PatientAttachment) => a.id))
                const newFromDoctor = cloudAtts.filter(a => !localIds.has(a.id))

                if (newFromDoctor.length > 0) {
                  console.log(`[ClinicalStore] Merging ${newFromDoctor.length} doctor-uploaded file(s) from cloud`)
                  if (db) {
                    for (const att of newFromDoctor) {
                      try { await db.patient_attachments.put(att) } catch { /* ignore */ }
                    }
                  }
                  set((state) => {
                    state.attachments = [...state.attachments, ...newFromDoctor]
                  })
                }
              }
            } catch (pulseErr) {
              console.warn('[ClinicalStore] Could not establish clinical pulse:', pulseErr)
            }
          }

        } catch (error) {
          clearTimeout(timeoutId)
          console.error('Failed to load clinical data:', error)
          set((state) => { state.isLoading = false })
        }
      },

      loadAuditLog: async (userId: string) => {
        if (!db) return
        const events = await db.audit_log.where('userId').equals(userId).toArray()
        set((state) => {
          state.auditEvents = events.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        })
      },

      syncAtomic: async (patientId: string, key: string, value: any) => {
        const { role, firebaseUid, getUserIdByHealthId } = useUserStore.getState()
        
        // Ensure we use the Auth UID for the cloud sync
        let targetUid = patientId
        if (patientId.startsWith('EHI-')) {
          const resolved = await getUserIdByHealthId(patientId)
          if (resolved) targetUid = resolved
        } else if (patientId === 'self' && firebaseUid) {
          targetUid = firebaseUid
        }

        if (role === 'doctor') {
          try {
            if (!supabase) return
            
            // SANITIZATION GUARD: Never sync records that still have blob/data URLs
            const isUnsanitized = (val: any) => {
              const url = val.fileUrl || val.imageUrl || val.url || ''
              return typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'))
            }

            if (isUnsanitized(value)) {
              console.warn(`[ClinicalStore] Blocking atomic sync for unsanitized ${key} (blob/data URL detected). Record will sync once digitized.`)
              return
            }

            console.log(`[ClinicalStore] Syncing atomicaly: ${key} for patient ${targetUid}`)
            const { error } = await supabase.rpc('append_clinical_data', {
              p_patient_id: targetUid,
              p_key: key,
              p_value: value
            })
            
            if (error) {
              console.error(`[ClinicalStore] Atomic Sync (RPC) Error:`, error)
              throw error
            }
          } catch (err) {
            console.error('[ClinicalStore] Failed atomic sync:', err)
          }
        } else {
          void get().syncToCloud(targetUid)
        }
      },

      addVital: async (patientId: string, vital: VitalSeries) => {
        const vitalWithId = { ...vital, patientId }
        if (db) await db.vitals.add(vitalWithId as any)
        set((state) => {
          state.vitals.push(vital)
        })
        void get().syncAtomic(patientId, 'vitals', vital)
      },

      addCondition: async (patientId: string, condition: Condition) => {
        const condWithId = { ...condition, patientId }
        if (db) await db.conditions.add(condWithId as any)
        set((state) => {
          state.conditions.push(condition)
        })
        void get().syncAtomic(patientId, 'conditions', condition)
      },

      addMedication: async (patientId: string, medication: MedicationRequest) => {
        const medWithId = { ...medication, patientId }
        if (db) await db.medications.add(medWithId as any)
        set((state) => {
          state.medications.push(medication)
        })
        void get().syncAtomic(patientId, 'medications', medication)
      },

      addObservation: async (patientId: string, observation: any) => {
        const obsWithId = { ...observation, patientId }
        if (db) await db.observations.add(obsWithId)
        set((state) => {
          state.observations.push(observation)
        })
        void get().syncAtomic(patientId, 'observations', observation)
      },

      addDiagnosticReport: async (patientId: string, report: any) => {
        const reportWithId = { ...report, patientId }
        if (db) await db.diagnostic_reports.add(reportWithId)
        set((state) => {
          state.diagnosticReports.push(report)
        })
        void get().syncAtomic(patientId, 'diagnosticReports', report)
      },

      addImmunization: async (patientId: string, immunization: any) => {
        const immWithId = { ...immunization, patientId }
        if (db) await db.immunizations.add(immWithId)
        set((state) => {
          state.immunizations.push(immunization)
        })
        void get().syncAtomic(patientId, 'immunizations', immunization)
      },

      addProcedure: async (patientId: string, procedure: any) => {
        const procWithId = { ...procedure, patientId }
        if (db) await db.procedures.add(procWithId)
        set((state) => {
          state.procedures.push(procedure)
        })
        void get().syncAtomic(patientId, 'procedures', procedure)
      },

      addClinicalNote: async (note: ClinicalNote) => {
        if (db) await db.clinical_notes.add(note)
        set((state) => {
          state.clinicalNotes.unshift(note)
        })
        void get().syncAtomic(note.patientId, 'clinicalNotes', note)
      },

      addMedicalImage: async (image: MedicalImage) => {
        // PRIORITY: Never write to Dexie or Cloud until the upload is FINISHED
        let finalImage = { ...image }
        let storagePath = ''
        
        if (image.imageUrl.startsWith('blob:') || image.imageUrl.startsWith('data:')) {
          try {
            const { uploadMedicalFile, blobUrlToBlob } = await import('@/lib/cloudStorage')
            console.log('[ClinicalStore] digitizing image to cloud storage...')
            const blob = await blobUrlToBlob(image.imageUrl)
            
            // Resolve correct Auth UID for the storage path
            const { firebaseUid, role, getUserIdByHealthId } = useUserStore.getState()
            let targetUid = image.patientId
            if (role === 'doctor' && image.patientId.startsWith('EHI-')) {
               const resolved = await getUserIdByHealthId(image.patientId)
               if (resolved) targetUid = resolved
            } else if (role === 'patient') {
               targetUid = firebaseUid || image.patientId
            }

            const uploadResult = await uploadMedicalFile(targetUid, image.id, blob)
            
            // Critical: Ensure we have a permanent storagePath
            if (!uploadResult.storagePath) throw new Error('Cloud storage failed to return path')
            
            finalImage.imageUrl = uploadResult.storagePath
            finalImage.storagePath = uploadResult.storagePath
            finalImage.patientId = targetUid // Use Auth UID for metadata consistency
            storagePath = uploadResult.storagePath
          } catch (error) {
            console.error('[ClinicalStore] Failed to digitize image to Cloud:', error)
            throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown storage error'}`)
          }
        }

        // Apply doctor tracing if applicable
        const { role, firebaseUid } = useUserStore.getState()
        if (role === 'doctor' && firebaseUid) {
          finalImage.doctorId = firebaseUid
        }

        // Now that we have a permanent URL, write to store and cloud
        if (db) await db.medical_images.add(finalImage)
        set((state) => {
          state.medicalImages.unshift(finalImage)
        })
        
        // Sync to cloud ONLY after image is digitized
        void get().syncAtomic(finalImage.patientId, 'medicalImages', finalImage)
        
        if (role === 'doctor' && firebaseUid && storagePath && supabase) {
          console.log('[ClinicalStore] Generating 7-day image permissions for doctor:', firebaseUid)
          await supabase.from('record_access_permissions').upsert([
            { 
              record_id: storagePath, 
              patient_id: image.patientId, 
              doctor_id: firebaseUid, 
              permission_type: 'view', 
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
            },
            { 
              record_id: storagePath, 
              patient_id: image.patientId, 
              doctor_id: firebaseUid, 
              permission_type: 'download', 
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
            }
          ], { onConflict: 'record_id,doctor_id,patient_id,permission_type' })
        }
      },

      addRiskAnalysis: async (analysis: RiskAnalysis) => {
        if (db) await db.risk_analysis.add(analysis)
        set((state) => {
          state.riskAnalyses.unshift(analysis)
        })
        void get().syncAtomic(analysis.patientId, 'riskAnalyses', analysis)
      },

      addAttachment: async (attachment: PatientAttachment) => {
        // PRIORITY: Full Digitization First
        let finalAttachment = { ...attachment }
        let storagePath = ''

        if (attachment.fileUrl.startsWith('blob:') || attachment.fileUrl.startsWith('data:')) {
          try {
            const { uploadMedicalFile, blobUrlToBlob } = await import('@/lib/cloudStorage')
            console.log('[ClinicalStore] digitizing attachment to cloud storage...')
            const blob = await blobUrlToBlob(attachment.fileUrl)
            
            // Resolve correct Auth UID for the storage path
            const { firebaseUid, role, getUserIdByHealthId } = useUserStore.getState()
            let targetUid = attachment.patientId
            if (role === 'doctor' && attachment.patientId.startsWith('EHI-')) {
               const resolved = await getUserIdByHealthId(attachment.patientId)
               if (resolved) targetUid = resolved
            } else if (role === 'patient') {
               targetUid = firebaseUid || attachment.patientId
            }

            const uploadResult = await uploadMedicalFile(targetUid, attachment.id, blob)
            
            // Critical: Ensure we have a permanent storagePath
            if (!uploadResult.storagePath) throw new Error('Cloud storage failed to return path')
            
            finalAttachment.fileUrl = uploadResult.storagePath
            finalAttachment.storagePath = uploadResult.storagePath
            finalAttachment.patientId = targetUid // IMPORTANT: Standardize on Auth UID
            storagePath = uploadResult.storagePath
          } catch (error) {
            console.error('[ClinicalStore] Failed to digitize attachment to Cloud:', error)
            throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown storage error'}`)
          }
        }

        const { role, firebaseUid } = useUserStore.getState()
        if (role === 'doctor' && firebaseUid) {
          finalAttachment.doctorId = firebaseUid
        }

        // Now safe to persist metadata
        if (db) await db.patient_attachments.add(finalAttachment)
        set((state) => {
          state.attachments.unshift(finalAttachment)
        })
        
        // Sync metadata only AFTER crystallization of the cloud path
        void get().syncAtomic(finalAttachment.patientId, 'attachments', finalAttachment)

        // Generate initial permissions for doctor-uploaded files
        if (role === 'doctor' && firebaseUid && storagePath && supabase) {
           console.log('[ClinicalStore] Generating 7-day permissions for new attachment:', storagePath)
           await supabase.from('record_access_permissions').upsert([
              { 
                record_id: storagePath, 
                patient_id: finalAttachment.patientId, 
                doctor_id: firebaseUid, 
                permission_type: 'view', 
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
              },
              { 
                record_id: storagePath, 
                patient_id: finalAttachment.patientId, 
                doctor_id: firebaseUid, 
                permission_type: 'download', 
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
              }
           ], { onConflict: 'record_id,doctor_id,patient_id,permission_type' })
        }
      },

      addAuditEvent: async (event: Omit<AuditEvent, 'hash' | 'previousHash'>, patientId?: string) => {
        const state = get()
        const previousEvent = state.auditEvents[0]
        const previousHash = previousEvent ? previousEvent.hash : '0000000000000000'
        
        const { sha256 } = await import('@/lib/crypto')
        const sortedFields = JSON.stringify(event, Object.keys(event).sort())
        const hash = await sha256(`${previousHash}:${sortedFields}`)
        
        const finalEvent: AuditEvent = {
          ...event,
          previousHash,
          hash
        }

        if (db) await db.audit_log.add(finalEvent)
        set((state) => {
          state.auditEvents.unshift(finalEvent)
        })
        
        if (patientId) {
          void get().syncAtomic(patientId, 'auditEvents', finalEvent)
        }
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
          state.isLoaded = false
        })
      },

      setEmergencyMode: (active: boolean) => set({ isEmergencyMode: active }),
      
      syncToCloud: async (explicitPatientId?: string) => {
        const state = get()
        if (!state.isLoaded) return

        const { firebaseUid, patient, getUserIdByHealthId } = useUserStore.getState()
        let targetId = explicitPatientId || patient?.healthId
        
        // Ensure we use the Auth UID (targetUid) for the database primary key
        if (targetId && targetId.startsWith('EHI-')) {
          const resolved = await getUserIdByHealthId(targetId)
          if (resolved) targetId = resolved
        } else if (!explicitPatientId && firebaseUid) {
          targetId = firebaseUid
        }

        if (!targetId) return

        try {
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) return

          // ATOMIC MERGE PROTECTION: Fetch latest cloud state before uploading
          const { data: existing } = await supabase
            .from('clinical_data')
            .select('data')
            .eq('patient_id', targetId)
            .maybeSingle()
          
          const cloudAttachments = existing?.data?.attachments || []
          const localAttachments = state.attachments
          
          // Merge logic: prefer local but keep cloud items not in local
          const localIds = new Set(localAttachments.map(a => a.id))
          const attachmentsToKeep = [...localAttachments, ...cloudAttachments.filter((a: any) => !localIds.has(a.id))]

          const isUnsanitized = (val: any) => {
            const url = val.fileUrl || val.imageUrl || val.url || ''
            return typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'))
          }

          const clinicalPayload = {
            vitals: state.vitals,
            conditions: state.conditions,
            medications: state.medications,
            allergies: state.allergies,
            observations: state.observations,
            diagnosticReports: state.diagnosticReports,
            immunizations: state.immunizations,
            procedures: state.procedures,
            clinicalNotes: state.clinicalNotes,
            medicalImages: state.medicalImages.filter(img => !isUnsanitized(img)),
            attachments: attachmentsToKeep.filter(att => !isUnsanitized(att)),
            riskAnalyses: state.riskAnalyses.filter(r => !isUnsanitized(r)),
            auditEvents: state.auditEvents,
          }

          const { error } = await supabase
            .from('clinical_data')
            .upsert({
              patient_id: targetId,
              data: clinicalPayload,
              last_synced_at: new Date().toISOString()
            })

          if (error) throw error
          
          set((state) => {
            state.lastUpdated = new Date().toISOString()
          })
          console.log('[ClinicalStore] Cloud sync completed (with atomic merging)')
        } catch (error) {
          console.error('[ClinicalStore] Supabase Sync Error:', error)
          throw error
        }
      },

      loadSharedClinicalData: async (tokenHash: string, handshakeKey: string) => {
        try {
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
            const { decryptBundle } = await import('@/lib/crypto')
            const bundle = await decryptBundle(encryptedBundle, handshakeKey)

            set((state) => {
               state.vitals = bundle.vitals || []
               state.conditions = bundle.conditions || []
               state.medications = bundle.medications || []
               state.allergies = bundle.allergies || []
               state.clinicalNotes = bundle.clinicalNotes || []
               state.medicalImages = bundle.medicalImages || []
               state.attachments = bundle.attachments || []
               state.riskAnalyses = bundle.riskAnalyses || []
               state.isLoading = false
               state.isLoaded = true
            })
            console.log('[ClinicalStore] Successfully loaded shared records from Supabase')
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
