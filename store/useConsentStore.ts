'use client'

/**
 * Consent Store — Active/expired/revoked tokens, generation, revocation.
 * Updated with Decentralized AI Minimization Handshake.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { ConsentToken, ConsentTokenRequest, AccessRequest } from '@/lib/types'
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
  createAccessRequest: (patientId: string, doctorId: string, doctorName: string, organization: string, patientName?: string | null) => Promise<void>
  loadAccessRequests: (uid: string, isDoctor: boolean) => void
  respondToAccessRequest: (requestId: string, approved: boolean, categories?: string[]) => Promise<void>
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

      createAccessRequest: async (patientId, doctorId, doctorName, organization, patientName) => {
        const newReq: AccessRequest = {
          id: `req-${Date.now()}`,
          doctorId,
          doctorName,
          organization,
          patientId,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
          patientName: patientName || null,
          sharedCategories: []
        }
        
        // 1. Local Save
        set((state) => {
          state.accessRequests.unshift(newReq)
        })
        if (typeof window !== 'undefined' && db) {
          void db.access_requests.add(newReq)
        }

        // 2. Supabase Sync (formerly Firestore)
        try {
          const { supabase } = await import('@/lib/supabase')
          if (supabase) {
            const { error: syncError } = await supabase
              .from('access_requests')
              .insert({
                id: newReq.id,
                doctor_id: newReq.doctorId,
                doctor_name: newReq.doctorName,
                organization: newReq.organization,
                patient_id: newReq.patientId,
                requested_at: newReq.requestedAt,
                status: newReq.status,
                patient_name: newReq.patientName,
                shared_categories: newReq.sharedCategories
              })
            if (syncError) throw syncError
            console.log('Access request synced to Supabase:', newReq.id)
          }
        } catch (err) {
          console.error('Supabase request sync failed:', err)
        }
      },

      loadAccessRequests: (uid: string, isDoctor: boolean) => {
        if (get().activeListenerId === uid) return
        
        const field = isDoctor ? 'doctor_id' : 'patient_id'
        console.log(`[ConsentStore] Initializing Supabase sync for ${field}:`, uid)

        set({ activeListenerId: uid, isLoading: true })

        const fetchRequests = async () => {
          try {
            const { supabase } = await import('@/lib/supabase')
            if (!supabase) return

            // 1. Initial Fetch
            const { data, error } = await supabase
              .from('access_requests')
              .select('*')
              .eq(field, uid)
              .order('requested_at', { ascending: false })

            console.log(`[ConsentStore] Supabase Fetch [${field}=${uid}]:`, { count: data?.length, error })

            if (error) throw error
            
            if (data) {
              console.log('[ConsentStore] Raw access_requests data:', data)
            }

            const formatted: AccessRequest[] = (data || []).map(d => ({
              id: d.id,
              doctorId: d.doctor_id,
              doctorName: d.doctor_name,
              organization: d.organization,
              patientId: d.patient_id,
              requestedAt: d.requested_at,
              status: d.status as any,
              patientName: d.patient_name,
              sharedCategories: d.shared_categories || []
            }))

            set((state) => {
              state.accessRequests = formatted
              state.isLoading = false
            })

            // 2. Subscribe to changes (Realtime)
            supabase
              .channel(`public:access_requests:${field}=${uid}`)
              .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'access_requests',
                filter: `${field}=eq.${uid}` 
              }, () => {
                fetchRequests() // Re-fetch on any change for simplicity
              })
              .subscribe()

          } catch (err) {
            console.error('[ConsentStore] Supabase sync error:', err)
            set({ activeListenerId: null, isLoading: false })
          }
        }

        fetchRequests()
      },

      respondToAccessRequest: async (requestId, approved, categories = []) => {
        const status = approved ? 'APPROVED' : 'DENIED'
        
        set((state) => {
          const req = state.accessRequests.find(r => r.id === requestId)
          if (req) {
            req.status = status
            req.sharedCategories = approved ? categories : []
          }
        })
        
        // 1. Local Update
        if (typeof window !== 'undefined' && db) {
          void db.access_requests.update(requestId, { 
            status, 
            sharedCategories: approved ? categories : [] 
          })
        }

        // 2. Supabase Update
        try {
          const { supabase } = await import('@/lib/supabase')
          if (supabase) {
            const { error: updateError } = await supabase
              .from('access_requests')
              .update({ 
                status, 
                shared_categories: approved ? categories : [] 
              })
              .eq('id', requestId)
            if (updateError) throw updateError
          }
        } catch (err) {
          console.error('Supabase response sync failed:', err)
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
