'use client'

/**
 * Consent Store — Active/expired/revoked tokens, generation, revocation.
 * Updated with Decentralized AI Minimization Handshake.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { ConsentToken, ConsentTokenRequest } from '@/lib/types'
import { generateConsentToken, revokeConsentToken } from '@/lib/consentTokens'
import { isExpired } from '@/lib/utils'
import { useUserStore } from './useUserStore'
import { db } from '@/lib/db'

export interface AccessRequest {
  id: string
  doctorId: string
  doctorName: string
  organization: string
  patientId: string // EHI ID
  requestedAt: string
  status: 'PENDING' | 'APPROVED' | 'DENIED'
  patientName?: string | null
}

interface ConsentState {
  activeTokens: ConsentToken[]
  expiredTokens: ConsentToken[]
  revokedTokens: ConsentToken[]
  accessRequests: AccessRequest[]
  isGenerating: boolean
  isRevoking: boolean
  isLoading: boolean
  pendingRevocationId: string | null
  isListening: boolean
}

interface ConsentActions {
  loadTokens: () => Promise<void>
  generateToken: (request: ConsentTokenRequest) => Promise<ConsentToken>
  revokeToken: (tokenId: string, reason: string) => Promise<void>
  refreshTokenStatuses: () => void
  createAccessRequest: (patientId: string, doctorId: string, doctorName: string, organization: string, patientName?: string | null) => Promise<void>
  loadAccessRequests: (uid: string, isDoctor: boolean) => void
  respondToAccessRequest: (requestId: string, approved: boolean) => Promise<void>
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
      isListening: false,
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

          // Step C: Push encrypted bundle to Firestore relay
          if ((request as any).encryptedBundle) {
            try {
              const { db_firestore } = await import('@/lib/firebase')
              const { doc, setDoc } = await import('firebase/firestore')
              
              if (db_firestore) {
                await setDoc(doc(db_firestore, 'shared_secrets', newToken.id), {
                  bundle: (request as any).encryptedBundle,
                  expiresAt: newToken.expiresAt,
                  patientName: patient.name,
                  createdAt: new Date().toISOString()
                })
                console.log('Encrypted bundle pushed to Firestore relay:', newToken.id)
              }
            } catch (err) {
              console.error('Firestore relay push failed:', err)
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
          patientName: patientName || null
        }
        
        // 1. Local Save
        set((state) => {
          state.accessRequests.unshift(newReq)
        })
        if (typeof window !== 'undefined' && db) {
          void db.access_requests.add(newReq)
        }

        // 2. Firestore Sync
        try {
          const { db_firestore } = await import('@/lib/firebase')
          const { doc, setDoc } = await import('firebase/firestore')
          if (db_firestore) {
            await setDoc(doc(db_firestore, 'access_requests', newReq.id), newReq)
            console.log('Access request synced to Firestore:', newReq.id)
          }
        } catch (err) {
          console.error('Firestore request sync failed:', err)
        }
      },

      loadAccessRequests: (uid: string, isDoctor: boolean) => {
        if (get().isListening) return // Prevent duplicate listeners
        
        try {
          const field = isDoctor ? 'doctorId' : 'patientId'
          console.log(`[ConsentStore] Initializing real-time sync for ${field}:`, uid)

          set({ isListening: true })

          // Use import() inside since this might be called frequently
          import('@/lib/firebase').then(({ db_firestore }) => {
            if (!db_firestore) {
              set({ isListening: false })
              return
            }
            
            import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
              const q = query(
                collection(db_firestore, 'access_requests'),
                where(field, '==', uid)
              )

              const unsubscribe = onSnapshot(q, (snapshot) => {
                const requests = snapshot.docs
                  .map(doc => doc.data() as AccessRequest)
                  .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
                
                console.log(`[ConsentStore] Received ${requests.length} requests for ${uid}`)
                set((state) => {
                  state.accessRequests = requests
                  state.isLoading = false
                })
              }, (err) => {
                console.error('[ConsentStore] Firestore snapshot error:', err)
                set({ isListening: false })
              })

              // Cleanup on session reset would be better, but for now we persist
            })
          })
        } catch (err) {
          console.error('Failed to initialize access request sync:', err)
          set({ isListening: false })
        }
      },

      respondToAccessRequest: async (requestId, approved) => {
        const status = approved ? 'APPROVED' : 'DENIED'
        
        set((state) => {
          const req = state.accessRequests.find(r => r.id === requestId)
          if (req) req.status = status
        })
        
        // 1. Local Update
        if (typeof window !== 'undefined' && db) {
          void db.access_requests.update(requestId, { status })
        }

        // 2. Firestore Update
        try {
          const { db_firestore } = await import('@/lib/firebase')
          const { doc, updateDoc } = await import('firebase/firestore')
          if (db_firestore) {
            await updateDoc(doc(db_firestore, 'access_requests', requestId), { status })
          }
        } catch (err) {
          console.error('Firestore response sync failed:', err)
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
