'use client'

/**
 * Consent Store — Active/expired/revoked tokens, generation, revocation.
 * Updated with Decentralized AI Minimization Handshake.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { ConsentToken, ConsentTokenRequest, AccessRequest } from '@/lib/types'
import { DoctorSpecialty } from '@/lib/types'
import { generateConsentToken, revokeConsentToken } from '@/lib/consentTokens'
import { isExpired } from '@/lib/utils'
import { useUserStore } from './useUserStore'
import { db } from '@/lib/db'

interface ConsentState {
  activeTokens: ConsentToken[]
  expiredTokens: ConsentToken[]
  revokedTokens: ConsentToken[]
  accessRequests: AccessRequest[]
  isGenerating: boolean
  isRevoking: boolean
  isLoading: boolean
  pendingRevocationId: string | null
  activeListenerId: string | null
}

interface ConsentActions {
  loadTokens: () => Promise<void>
  generateToken: (request: ConsentTokenRequest) => Promise<ConsentToken>
  revokeToken: (tokenId: string, reason: string) => Promise<void>
  refreshTokenStatuses: () => void
  createAccessRequest: (patientId: string, doctorId: string, doctorName: string, doctorSpecialty: DoctorSpecialty, organization: string, reason?: string, patientName?: string | null, sharedCategories?: string[], doctorRole?: string | null) => Promise<void>
  requestFileAccess: (patientId: string, doctorId: string, doctorName: string, doctorSpecialty: DoctorSpecialty, organization: string, fileId: string, fileName: string, reason?: string, patientName?: string | null, doctorRole?: string | null) => Promise<void>
  loadAccessRequests: (uid: string, isDoctor: boolean) => void
  respondToAccessRequest: (requestId: string, approved: boolean, categories?: string[], permissionType?: 'view' | 'download', expiresAt?: string | null) => Promise<void>
  parseEHILink: (url: string) => { healthId: string; name: string } | null
}

export const useConsentStore = create<ConsentState & ConsentActions>()(
  devtools(
    immer((set, get) => ({
      // State
      activeTokens: [],
      expiredTokens: [],
      revokedTokens: [],
      accessRequests: [],
      isGenerating: false,
      isRevoking: false,
      isLoading: false,
      activeListenerId: null,
      sharedCategories: [],
      pendingRevocationId: null,

      // Actions
      loadTokens: async () => {
        if (typeof window === 'undefined' || !db) return
        set((state) => { state.isLoading = true })
        try {
          const tokens = await db.consent_tokens.toArray()
          const requests = await db.access_requests.toArray()

          const active: ConsentToken[] = []
          const expired: ConsentToken[] = []
          const revoked: ConsentToken[] = []

          for (const token of tokens) {
            if (token.status === 'REVOKED') {
              revoked.push(token)
            } else if (token.status === 'ACTIVE' && !isExpired(token.expiresAt)) {
              active.push(token)
            } else {
              expired.push(token)
            }
          }

          set((state) => {
            state.activeTokens = active.sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())
            state.expiredTokens = expired
            state.revokedTokens = revoked
            state.accessRequests = requests
            state.isLoading = false
          })
        } catch (error) {
          console.error('Failed to load clinical consent data:', error)
          set((state) => { state.isLoading = false })
        }
      },

      generateToken: async (request: ConsentTokenRequest) => {
        const { patient } = useUserStore.getState()
        if (!patient) throw new Error('Patient not found')

        set((state) => {
          state.isGenerating = true
        })

        try {
          const newToken = await generateConsentToken(request)

          // Step C: Push encrypted bundle to Supabase relay (formerly Firestore)
          if ((request as any).encryptedBundle) {
            try {
              const { supabase } = await import('@/lib/supabase')
              if (supabase) {
                const { error: relayError } = await supabase
                  .from('shared_secrets')
                  .insert({
                    id: newToken.id,
                    bundle: (request as any).encryptedBundle,
                    expires_at: newToken.expiresAt,
                    patient_name: patient.name,
                    created_at: new Date().toISOString()
                  })
                if (relayError) throw relayError
                console.log('Encrypted bundle pushed to Supabase relay:', newToken.id)
              }
            } catch (err) {
              console.error('Supabase relay push failed:', err)
            }
          }

          await db.consent_tokens.add(newToken)

          // Step D: GRANT RECORD-LEVEL PERMISSIONS (New Security Layer Sync)
          // Automatically grant view/download permissions for all relevant files
          try {
            const { supabase } = await import('@/lib/supabase')
            const clinicalData = (await import('./useClinicalStore')).useClinicalStore.getState()
            
            // Collect all shareable records (DiagnosticReports, Attachments, MedicalImages)
            const reports = clinicalData.diagnosticReports || []
            const attachments = clinicalData.attachments || []
            const images = clinicalData.medicalImages || []
            
            const allRecords = [...reports, ...attachments, ...images]
            
                        if (supabase && allRecords.length > 0) {
                          const permissions = allRecords.flatMap(record => {
                            const recordId = record.storagePath || record.id
                             return [
                               {
                                 record_id: recordId,
                                 patient_id: request.patientId,
                                 doctor_id: request.recipientId,
                                 permission_type: 'view',
                                 expires_at: newToken.expiresAt,
                                 is_revoked: false
                               },
                               {
                                 record_id: recordId,
                                 patient_id: request.patientId,
                                 doctor_id: request.recipientId,
                                 permission_type: 'download',
                                 expires_at: newToken.expiresAt,
                                 is_revoked: false
                               }
                             ]
                          })

              const { error: permError } = await supabase
                .from('record_access_permissions')
                .upsert(permissions, { onConflict: 'doctor_id,patient_id,record_id,permission_type' })
                
              if (permError) console.error('Record permissions sync failed:', permError)
              else console.log('Synchronized record permissions for doctor:', request.recipientId)
            }
          } catch (err) {
            console.error('Record-level permission auto-grant failed:', err)
          }

          set((state) => {
            state.activeTokens.unshift(newToken)
            state.isGenerating = false
          })

          return newToken
        } catch (error) {
          set((state) => {
            state.isGenerating = false
          })
          throw error
        }
      },

      revokeToken: async (tokenId: string, reason: string) => {
        set((state) => {
          state.isRevoking = true
          state.pendingRevocationId = tokenId
        })

        const activeTokens = get().activeTokens
        const tokenToRevoke = activeTokens.find((t) => t.id === tokenId)

        if (tokenToRevoke) {
          const revokedToken: ConsentToken = {
            ...tokenToRevoke,
            status: 'REVOKED' as const,
            revokedAt: new Date().toISOString(),
            revocationReason: reason,
          }

          set((state) => {
            state.activeTokens = state.activeTokens.filter((t) => t.id !== tokenId)
            state.revokedTokens.push(revokedToken)
          })

          try {
            await db.consent_tokens.update(tokenId, {
              status: 'REVOKED',
              revokedAt: revokedToken.revokedAt,
              revocationReason: reason
            })
            
            await revokeConsentToken(tokenId, reason, tokenToRevoke.patientId)

            // Step E: REVOKE RECORD-LEVEL PERMISSIONS (New Security Layer Sync)
            try {
              const { supabase } = await import('@/lib/supabase')
              if (supabase) {
                const { error: revError } = await supabase
                  .from('record_access_permissions')
                  .update({ is_revoked: true })
                  .eq('doctor_id', tokenToRevoke.recipientId)
                  .eq('patient_id', tokenToRevoke.patientId)
                
                if (revError) console.error('Record-level revocation sync failed:', revError)
                else console.log('Revoked all record permissions for doctor:', tokenToRevoke.recipientId)
              }
            } catch (err) {
              console.error('Record-level revocation failed:', err)
            }

            set((state) => {
              state.isRevoking = false
              state.pendingRevocationId = null
            })
          } catch (error) {
            // Rollback
            set((state) => {
              state.revokedTokens = state.revokedTokens.filter((t) => t.id !== tokenId)
              state.activeTokens.push(tokenToRevoke)
              state.isRevoking = false
              state.pendingRevocationId = null
            })
            throw error
          }
        }
      },

      createAccessRequest: async (patientId, doctorId, doctorName, doctorSpecialty, organization, reason, patientName, sharedCategories, doctorRole) => {
        const newReq: AccessRequest = {
          id: crypto.randomUUID(),
          doctorId,
          doctorName,
          doctorSpecialty,
          organization,
          patientId,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
          patientName: patientName || null,
          reason: reason || null,
          sharedCategories: sharedCategories || [],
          doctorRole: doctorRole || null,
          permissionType: 'view', // Default
          metadata: {}
        }
        
        set((state) => {
          state.accessRequests.unshift(newReq)
        })
        if (typeof window !== 'undefined' && db) {
          void db.access_requests.add(newReq)
        }

        try {
          const { supabase } = await import('@/lib/supabase')
          if (supabase) {
            const { error: syncError } = await supabase
              .from('access_requests')
              .insert({
                id: newReq.id,
                doctor_id: newReq.doctorId,
                doctor_name: newReq.doctorName,
                doctor_specialty: newReq.doctorSpecialty,
                organization: newReq.organization,
                patient_id: newReq.patientId,
                requested_at: newReq.requestedAt,
                status: newReq.status,
                patient_name: newReq.patientName,
                reason: newReq.reason,
                shared_categories: newReq.sharedCategories,
                metadata: newReq.metadata,
                doctor_role: newReq.doctorRole,
                permission_type: newReq.permissionType
              })
            if (syncError) throw syncError
          }
        } catch (err: any) {
          console.error('[ConsentStore] Access request sync failed:', err?.message || err)
          if (err?.details) console.error('[ConsentStore] Error details:', err.details, err.hint)
        }
      },

      requestFileAccess: async (patientId, doctorId, doctorName, doctorSpecialty, organization, fileId, fileName, reason, patientName, doctorRole) => {
        const newReq: AccessRequest = {
          id: crypto.randomUUID(),
          doctorId,
          doctorName,
          doctorSpecialty,
          organization,
          patientId,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
          patientName: patientName || null,
          reason: reason || null,
          sharedCategories: [],
          doctorRole: doctorRole || null,
          permissionType: 'view',
          metadata: { fileId, fileName, isFileRequest: true }
        }
        
        set((state) => {
          state.accessRequests.unshift(newReq)
        })
        if (typeof window !== 'undefined' && db) {
          void db.access_requests.add(newReq)
        }

        try {
          const { supabase } = await import('@/lib/supabase')
          if (supabase) {
            const { error: syncError } = await supabase
              .from('access_requests')
              .insert({
                id: newReq.id,
                doctor_id: newReq.doctorId,
                doctor_name: newReq.doctorName,
                doctor_specialty: newReq.doctorSpecialty,
                organization: newReq.organization,
                patient_id: newReq.patientId,
                requested_at: newReq.requestedAt,
                status: newReq.status,
                patient_name: newReq.patientName,
                reason: newReq.reason,
                shared_categories: newReq.sharedCategories,
                metadata: newReq.metadata,
                doctor_role: newReq.doctorRole,
                permission_type: newReq.permissionType
              })
            if (syncError) throw syncError
          }
        } catch (err: any) {
          console.error('[ConsentStore] File access request sync failed:', err?.message || err)
          if (err?.details) console.error('[ConsentStore] Error details:', err.details, err.hint)
        }
      },

      loadAccessRequests: (uid: string, isDoctor: boolean) => {
        if (get().activeListenerId === uid) return
        
        const field = isDoctor ? 'doctor_id' : 'patient_id'
        console.log(`[ConsentStore] Initializing Supabase sync for ${field}:`, uid)

        set({ activeListenerId: uid, isLoading: true })

        let isFetching = false // Guard against re-entrant realtime callbacks

        const fetchRequests = async () => {
          if (isFetching) return // Skip if already in-flight
          isFetching = true
          try {
            const { supabase } = await import('@/lib/supabase')
            if (!supabase) return

            // 1. Initial Fetch
            const { data, error } = await supabase
              .from('access_requests')
              .select('id, doctor_id, doctor_name, doctor_specialty, organization, patient_id, requested_at, status, patient_name, reason, doctor_role, permission_type, expires_at, shared_categories, metadata')
              .eq(field, uid)
              .order('requested_at', { ascending: false })

            if (error) throw error

            const formatted: AccessRequest[] = (data || []).map(item => ({
              id: item.id,
              doctorId: item.doctor_id,
              doctorName: item.doctor_name,
              doctorSpecialty: item.doctor_specialty as DoctorSpecialty,
              organization: item.organization,
              patientId: item.patient_id,
              requestedAt: item.requested_at,
              status: item.status as any,
              patientName: item.patient_name,
              reason: item.reason,
              doctorRole: item.doctor_role,
              permissionType: item.permission_type,
              expiresAt: item.expires_at,
              sharedCategories: item.shared_categories || [],
              metadata: item.metadata || {}
            }))

            set((state) => {
              state.accessRequests = formatted
              state.isLoading = false
            })

            // 2. Subscribe to changes (Realtime) — only register once
            const channelName = `public:access_requests:${field}=${uid}`
            const existingChannel = supabase.channel(channelName)
            // Remove & re-subscribe to avoid duplicate listeners
            await supabase.removeChannel(existingChannel)
            supabase
              .channel(channelName)
              .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'access_requests',
                filter: `${field}=eq.${uid}` 
              }, () => {
                void fetchRequests() // Guard prevents re-entrant loops
              })
              .subscribe()

          } catch (err) {
            console.error('[ConsentStore] Supabase sync error:', err)
            set({ activeListenerId: null, isLoading: false })
          } finally {
            isFetching = false
          }
        }

        fetchRequests()
      },

      respondToAccessRequest: async (requestId, approved, categories, permissionType, expiresAt) => {
        set((state) => { state.isLoading = true })
        try {
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) throw new Error('Supabase not available')

          const { error } = await supabase
            .from('access_requests')
            .update({ 
               status: approved ? 'APPROVED' : 'DENIED',
               shared_categories: categories || [],
               permission_type: permissionType || 'view',
               expires_at: expiresAt || null
            })
            .eq('id', requestId)
          
          if (error) throw error

          // Update local state
          set((state) => {
            const req = state.accessRequests.find(r => r.id === requestId)
            if (req) {
              req.status = approved ? 'APPROVED' : 'DENIED'
              req.sharedCategories = categories || []
              req.permissionType = permissionType || 'view'
              req.expiresAt = expiresAt || null
            }
            state.isLoading = false
          })
        } catch (err) {
          console.error('Supabase response sync failed:', err)
          set((state) => { state.isLoading = false })
        }
      },

      refreshTokenStatuses: () => {
        set((state) => {
          const stillActive: ConsentToken[] = []
          const newlyExpired: ConsentToken[] = []

          for (const token of state.activeTokens) {
            if (isExpired(token.expiresAt)) {
              newlyExpired.push({ ...token, status: 'EXPIRED' })
              if (typeof window !== 'undefined' && db) {
                void db.consent_tokens.update(token.id, { status: 'EXPIRED' })
              }
            } else {
              stillActive.push(token)
            }
          }

          state.activeTokens = stillActive
          state.expiredTokens = [...state.expiredTokens, ...newlyExpired]
        })
      },

      parseEHILink: (url: string) => {
        try {
          if (!url.startsWith('ehi://connect')) return null
          const params = new URLSearchParams(url.split('?')[1])
          const healthId = params.get('healthId')
          const name = params.get('name')
          if (healthId && name) {
            return { healthId, name: decodeURIComponent(name) }
          }
        } catch (e) {
          console.error('Failed to parse EHI link:', e)
        }
        return null
      }
    })),
    { name: 'ConsentStore' }
  )
)
