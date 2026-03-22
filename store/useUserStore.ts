'use client'

/**
 * User Store — Patient profile, crypto keys, auth state.
 * See Section 12 specification.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { PatientProfile } from '@/lib/types'

export type SessionState = 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'LOCKED' | 'SUSPENDED' | 'ALERT'
export type UserRole = 'patient' | 'doctor' | null

interface UserState {
  role: UserRole
  patient: PatientProfile | null
  dataKey: CryptoKey | null
  publicKey: CryptoKey | null
  privateKey: CryptoKey | null
  sessionState: SessionState
  failedAttempts: number
  lastActiveAt: number | null
  isLoading: boolean
  lastSyncAt: string | null
  healthId: string | null
  _hasHydrated: boolean
}

interface UserActions {
  setRole: (role: UserRole) => void
  initializeKeys: () => Promise<void>
  setPatient: (profile: PatientProfile) => void
  signOut: () => void
  setSessionState: (state: SessionState) => void
  recordFailedAttempt: () => void
  resetFailedAttempts: () => void
  updateLastActive: () => void
  checkBackgroundLock: () => void
  updatePatient: (profile: Partial<PatientProfile>) => void
  loadPatient: (id: string) => Promise<void>
  setHasHydrated: (val: boolean) => void
}

import { db } from '@/lib/db'

export const useUserStore = create<UserState & UserActions>()(
  devtools(
    persist(
      immer((set, get) => ({
      // State
      role: null,
      patient: null,
      dataKey: null,
      publicKey: null,
      privateKey: null,
      sessionState: 'UNAUTHENTICATED',
      failedAttempts: 0,
      lastActiveAt: null,
      isLoading: false,
      lastSyncAt: null,
      healthId: null,
      _hasHydrated: false,

      // Actions
      setRole: (role: UserRole) => {
        set((state) => {
          state.role = role
        })
      },

      initializeKeys: async () => {
        set((state) => {
          state.isLoading = true
        })

        try {
          const { generateDataKey, generatePatientKeyPair } = await import('@/lib/crypto')
          const dataKey = await generateDataKey()
          const { publicKey, privateKey } = await generatePatientKeyPair()

          set((state) => {
            state.dataKey = dataKey
            state.publicKey = publicKey
            state.privateKey = privateKey
            state.isLoading = false
          })
        } catch (error) {
          console.error('Failed to initialize keys:', error)
          set((state) => {
            state.isLoading = false
          })
        }
      },

      setPatient: (profile: PatientProfile) => {
        set((state) => {
          state.patient = profile
          state.healthId = profile.healthId
        })
        if (typeof window !== 'undefined' && db) {
          void db.patient_profiles.put(profile)
        }
      },

      loadPatient: async (id: string) => {
        if (typeof window === 'undefined' || !db) return
        const profile = await db.patient_profiles.get(id)
        if (profile) {
          set((state) => {
            state.patient = profile
            state.healthId = profile.healthId
          })
        }
      },

      signOut: () => {
        set((state) => {
          state.role = null
          state.patient = null
          state.dataKey = null
          state.publicKey = null
          state.privateKey = null
          state.sessionState = 'UNAUTHENTICATED'
          state.healthId = null
          state.failedAttempts = 0
          state.lastActiveAt = null
        })
      },

      setSessionState: (sessionState: SessionState) => {
        set((state) => {
          state.sessionState = sessionState
        })
      },

      recordFailedAttempt: () => {
        set((state) => {
          state.failedAttempts += 1
          if (state.failedAttempts >= 3) {
            state.sessionState = 'SUSPENDED'
          }
        })
      },

      resetFailedAttempts: () => {
        set((state) => {
          state.failedAttempts = 0
        })
      },

      updateLastActive: () => {
        set((state) => {
          state.lastActiveAt = Date.now()
        })
      },

      checkBackgroundLock: () => {
        const { lastActiveAt, sessionState } = get()
        if (sessionState === 'AUTHENTICATED' && lastActiveAt) {
          const elapsed = Date.now() - lastActiveAt
          // 5 minutes timer
          if (elapsed > 5 * 60 * 1000) {
            set((state) => {
              state.sessionState = 'LOCKED'
            })
          }
        }
      },

      updatePatient: (profile) => {
        set((state) => {
          if (state.patient) {
            state.patient = { ...state.patient, ...profile }
            state.healthId = state.patient.healthId
            void db.patient_profiles.update(state.patient.id, profile)
          }
        })
      },
      setHasHydrated: (val) => {
        set((state) => {
          state._hasHydrated = val
        })
      },
    })),
    { 
      name: 'ehi-user-storage',
      onRehydrateStorage: (state) => {
        return () => state.setHasHydrated(true)
      },
      partialize: (state) => ({ 
        role: state.role, 
        patient: state.patient, 
        healthId: state.healthId,
        sessionState: state.sessionState === 'AUTHENTICATED' ? 'LOCKED' : state.sessionState,
        lastActiveAt: state.lastActiveAt,
      }) 
    }
  ),
  { name: 'UserStore' }
)
)
